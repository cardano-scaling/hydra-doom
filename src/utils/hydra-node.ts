/// A broker for communicating with Hydra over websockets
import { Core } from "@blaze-cardano/sdk";
import { decode } from "cbor-x";
import WebSocket from "ws";

import { fromHex, toHex } from "./helpers";
import {
  Address,
  Credential,
  DatumHash,
  Delegation,
  OutRef,
  ProtocolParameters,
  Transaction,
  TxHash,
  Unit,
  UTxO,
} from "../types";

// const NETWORK_ID =
//   typeof process !== "undefined"
//     ? Number(process.env.NETWORK_ID)
//     : Number(import.meta.env.VITE_NETWORK_ID);
// const tx_parser = await Lucid.new(
//   undefined,
//   NETWORK_ID === 1 ? "Mainnet" : "Preprod",
// );
// const utils = new Utils(tx_parser);

export interface TransactionTiming {
  // Monotonic time when sent
  sent: number;
  // Milliseconds after sent when seen as valid
  seen?: number;
  // Milliseconds after sent when seen as invalid
  invalid?: number;
  // Milliseconds after sent when confirmed
  confirmed?: number;
}

export class Hydra {
  url: URL;
  connection: any;
  outbound_transactions: Array<[Transaction, TxHash]>;
  interval?: ReturnType<typeof setInterval>;
  utxos: { [txRef: string]: UTxO };
  tombstones: { [txRef: string]: boolean };

  onTxSeen?: (txId: TxHash, tx: any) => void;
  onTxConfirmed?: (txid: TxHash) => void;
  onTxInvalid?: (txid: TxHash) => void;

  tx_count: number;
  tx_timings: {
    [tx: string]: TransactionTiming;
  };

  constructor(
    url: string | URL,
    filterAddress?: string,
    onConnect?: () => void,
    onDisconnect?: () => void,
    public queue_length: number = 10,
  ) {
    this.tx_count = 0;
    this.tx_timings = {};
    this.outbound_transactions = [];
    this.utxos = {};
    this.tombstones = {};

    this.url = new URL(url);
    this.url.protocol = this.url.protocol.replace("ws", "http");
    const websocketUrl = new URL(url);
    websocketUrl.protocol = websocketUrl.protocol.replace("http", "ws");
    console.log(`onConnect: ${!!onConnect}, onDisconnect: ${!!onDisconnect}`);
    this.connection = new WebSocket(
      websocketUrl +
        (websocketUrl.toString().endsWith("/") ? "" : "/") +
        `?${filterAddress ? `address=${filterAddress}&` : ""}history=no`,
    );
    this.connection.onopen = () => {
      console.log("Connected to Hydra, callback: ", !!onConnect);
      onConnect?.();
    };
    this.connection.onerror = (error) => {
      console.error("Error on Hydra websocket: ", error);
    };
    this.connection.onclose = () => {
      console.error("Hydra websocket closed, callback: ", !!onDisconnect);
      onDisconnect?.();
    };
    this.connection.onmessage = this.receiveMessage.bind(this);
  }

  public isConnected(): boolean {
    return this.connection.readyState === WebSocket.OPEN;
  }

  public async populateUTxO() {
    const resp = await fetch(`${this.url}snapshot/utxo`);
    const rawUtxo = await resp.json();
    for (const key in rawUtxo) {
      const [txHash, idx] = key.split("#");
      const output = rawUtxo[key];
      // We use tombstones here to prevent race conditions
      if (!this.tombstones[key]) {
        this.utxos[key] = hydraUtxoToLucidUtxo(txHash, parseInt(idx), output);
      }
    }
  }

  async receiveMessage(message: MessageEvent) {
    try {
      const now = performance.now();
      const data = JSON.parse(message.data);
      switch (data.tag) {
        case "Greetings":
          break;
        case "TxValid":
          {
            const txid = data.transaction.txId;
            // Record seen time
            if (this.tx_timings[txid]?.sent) {
              const seenTime = now - this.tx_timings[txid].sent;
              this.tx_timings[txid].seen = seenTime;
              // console.log(`seen ${txid} after ${seenTime}ms`);
            }
            const cbor = fromHex(data.transaction.cborHex);
            const tx = decode(cbor);
            this.onTxSeen?.(txid, tx);
          }
          break;
        case "TxInvalid":
          {
            // console.error("TxInvalid", data);
            const txid = data.transaction.txId;
            if (this.tx_timings[txid]?.sent) {
              const invTime = now - this.tx_timings[txid].sent;
              this.tx_timings[txid].invalid = invTime;
            }
            this.onTxInvalid?.(txid);
          }
          break;
        case "SnapshotConfirmed":
          {
            for (const txid of data.snapshot.confirmedTransactions) {
              if (!this.tx_timings[txid]?.sent) {
                continue;
              }
              const confirmationTime = now - this.tx_timings[txid].sent;
              this.tx_timings[txid].confirmed = confirmationTime;
              this.onTxConfirmed?.(txid);
              // console.log(`confirmed ${txid} after ${confirmationTime}ms`);
            }
          }
          break;
        default:
          console.warn("Unexpected message: " + data);
      }

      if (this.tx_count > 10000) {
        // Purge anything older than 5s
        for (const tx in this.tx_timings) {
          if (this.tx_timings[tx]?.sent ?? 0 > now - 5000) {
            this.tx_count--;
            delete this.tx_timings[tx];
          }
          if (this.tx_count < 5000) {
            break;
          }
        }
      }
    } catch (err) {
      console.warn(err);
    }
  }

  public async getProtocolParameters(): Promise<ProtocolParameters> {
    const resp = await fetch(`${this.url}/protocol-parameters`);
    const rawParams = await resp.json();
    return {
      minFeeA: rawParams.txFeeFixed,
      minFeeB: rawParams.txFeePerByte,
      maxTxSize: rawParams.maxTxSize,
      maxValSize: rawParams.maxValueSize,
      keyDeposit: rawParams.stakeAddressDeposit,
      poolDeposit: rawParams.stakePoolDeposit,
      priceMem: rawParams.executionUnitPrices.priceMemory,
      priceStep: rawParams.executionUnitPrices.priceSteps,
      maxTxExMem: rawParams.maxTxExecutionUnits.memory,
      maxTxExSteps: rawParams.maxTxExecutionUnits.steps,
      coinsPerUtxoByte: rawParams.utxoCostPerByte,
      collateralPercentage: rawParams.collateralPercentage,
      maxCollateralInputs: rawParams.maxCollateralInputs,
      costModels: rawParams.costModels,
      minfeeRefscriptCostPerByte: rawParams.minfeeRefscriptCostPerByte,
    };
  }

  public async submitTx(tx: Transaction): Promise<string> {
    const txParsed = Core.Transaction.fromCbor(Core.TxCBOR(tx));
    const txId = txParsed.body().hash();
    this.tx_timings[txId] = { sent: performance.now() };
    this.tx_count++;
    this.connection.send(
      JSON.stringify({
        tag: "NewTx",
        transaction: {
          type: "Tx BabbageEra",
          cborHex: tx,
        },
      }),
    );
    return txId;
  }
  public async awaitTx(txId: TxHash, checkInterval?: number): Promise<boolean> {
    await new Promise((res) => {
      const interval = setInterval(() => {
        if (this.tx_timings[txId]?.confirmed) {
          clearInterval(interval);
          res(void 0);
        }
      }, checkInterval);
    });
    return true;
  }
  public async awaitUtxo(txRef: string, timeout: number = 1000): Promise<UTxO> {
    while (true) {
      if (this.utxos[txRef]) {
        return this.utxos[txRef];
      }
      const start = performance.now();
      await this.populateUTxO();
      timeout -= performance.now() - start;
      if (timeout <= 0) {
        throw new Error("Timeout waiting for UTXO");
      }
    }
  }

  public async getUtxos(address: Address): Promise<UTxO[]> {
    const ret: UTxO[] = [];
    for (const key in this.utxos) {
      const utxo = this.utxos[key];
      if (utxo.address === address) {
        ret.push(utxo);
      }
    }
    return ret;
  }
  public async getUtxosWithUnit(
    addressOrCredential: Address | Credential,
    unit: Unit,
  ): Promise<UTxO[]> {
    // we only support address for now
    if (
      !(
        typeof addressOrCredential === "string" ||
        addressOrCredential instanceof String
      )
    ) {
      throw new Error("not implemented");
    }
    const ret: UTxO[] = [];
    for (const key in this.utxos) {
      const utxo = this.utxos[key];
      if (utxo.address === addressOrCredential && utxo.assets[unit]) {
        ret.push(utxo);
      }
    }
    return ret;
  }
  public async getUtxoByUnit(unit: Unit): Promise<UTxO> {
    for (const key in this.utxos) {
      const utxo = this.utxos[key];
      if (utxo.assets[unit]) {
        return utxo;
      }
    }
    throw new Error("UTxO not found");
  }
  public async getUtxosByOutRef(outRefs: Array<OutRef>): Promise<UTxO[]> {
    const ret: UTxO[] = [];
    for (const outRef of outRefs) {
      const utxo = this.utxos[`${outRef.txHash}#${outRef.outputIndex}`];
      if (utxo) {
        ret.push(utxo);
      }
    }
    return ret;
  }
  public async getDelegation(): Promise<Delegation> {
    return {
      poolId: null,
      rewards: 0n,
    };
  }
  public async getDatum(datumHash: DatumHash): Promise<string> {
    for (const txRef in this.utxos) {
      if (this.utxos[txRef].datum) {
        const hash = Core.Datum.fromCbor(Core.HexBlob(this.utxos[txRef].datum!))
          .asInlineData()
          ?.hash();
        if (hash === datumHash) {
          return this.utxos[txRef].datum!;
        }
      }
    }
    throw new Error(`Datum with hash ${datumHash} not found`);
  }
}

function hydraUtxoToLucidUtxo(txHash: TxHash, idx: number, output: any): UTxO {
  const datumBytes = output.datum?.Data?.original_bytes
    ? toHex(output.datum.Data.original_bytes)
    : output.inlineDatum?.Data?.original;
  const assets = output.amount
    ? {
        lovelace: BigInt(output.amount.coin ?? 0n),
        ...output.amount.multiasset,
      }
    : {
        lovelace: BigInt(output.value.lovelace ?? 0n),
      };
  return {
    address: output.address,
    txHash: txHash,
    outputIndex: idx,
    datum: datumBytes,
    datumHash: output.inlineDatumhash,
    assets: assets,
  };
}
