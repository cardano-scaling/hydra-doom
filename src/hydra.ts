/// A broker for communicating with the hydra node
import {
  Address,
  DatumHash,
  Delegation,
  Lucid,
  OutRef,
  ProtocolParameters,
  Credential,
  toHex,
  Transaction,
  TxHash,
  Unit,
  UTxO,
  Utils,
  TxComplete,
} from "lucid-cardano";

const tx_parser = await Lucid.new(undefined, "Preprod");
const utils = new Utils(tx_parser);

export interface TransactionTiming {
  sent: number;
  seen?: number;
  invalid?: number;
  confirmed?: number;
}

export class Hydra {
  connection: WebSocket;
  outbound_transactions: Array<[Transaction, TxHash]>;
  interval?: ReturnType<typeof setInterval>;
  utxos: { [txRef: string]: UTxO };
  tombstones: { [txRef: string]: boolean };

  onTxSeen?: (txId: TxHash, tx: TxComplete) => void;
  onTxConfirmed?: (txid: TxHash) => void;
  onTxInvalid?: (txid: TxHash) => void;

  tx_count: number;
  tx_timings: {
    [tx: string]: TransactionTiming;
  };

  constructor(
    public url: string | URL,
    public queue_length: number = 10,
  ) {
    this.tx_count = 0;
    this.tx_timings = {};
    this.outbound_transactions = [];
    this.utxos = {};
    this.tombstones = {};

    let websocketUrl = new URL(url);
    websocketUrl.protocol = websocketUrl.protocol.replace("http", "ws");
    this.connection = new WebSocket(websocketUrl + "?history=no");
    this.connection.onopen = () => {
      console.log("Connected to Hydra");
    };
    this.connection.onerror = (error) => {
      console.error("Error on Hydra websocket: ", error);
    };
    this.connection.onclose = () => {
      console.error("Hydra websocket closed");
    };
    this.connection.onmessage = this.receiveMessage.bind(this);
  }

  public async populateUTxO() {
    const resp = await fetch(`${this.url}/snapshot/utxo`);
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

  public async startEventLoop() {
    if (this.interval) {
      return;
    }
    this.interval = setInterval(async () => await this.sendMessages());
  }

  async sendMessages() {
    const now = performance.now();
    while (true) {
      if (this.outbound_transactions.length === 0) {
        return;
      }
      const [next_tx, next_tx_id] = this.outbound_transactions[0];
      if (!this.tx_timings[next_tx_id]) {
        // If this transaction hasn't been sent, send it
        this.tx_count++;
        this.tx_timings[next_tx_id] = {
          sent: now,
        };
        this.connection.send(
          JSON.stringify({
            tag: "NewTx",
            transaction: {
              type: "Tx BabbageEra",
              cborHex: next_tx,
            },
          }),
        );
        // We don't want to risk sending another tx until that one is seen,
        // so we return here and do things on the next scheduled event loop
        return;
      } else if (
        this.tx_timings[next_tx_id].seen ||
        this.tx_timings[next_tx_id].invalid
      ) {
        // This transaction was either invalid or seen, so we can shift it off the outbound transactions;
        this.outbound_transactions.shift();
        // we can try to submit the next tx, so we can continue to the next one
        continue;
      } else if (this.tx_timings[next_tx_id]?.seen ?? now < now - 500) {
        // We have been waiting a half second for this tx to be seen, so log a warning
        console.warn(`Transaction not confirmed within 500ms: ${next_tx_id}`);
        this.outbound_transactions.shift();
        continue;
      } else {
        // We haven't seen it confirmed yet, so lets exit and wait for the next event loop
        return;
      }
    }
  }

  async receiveMessage(message: MessageEvent) {
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
          }
          const tx = tx_parser.fromTx(data.transaction.cborHex);
          for (const input of tx.txComplete.body().inputs().to_js_value()) {
            const ref = `${input.transaction_id}#${input.index}`;
            if (this.utxos[ref]) {
              delete this.utxos[ref];
            } else {
              this.tombstones[ref] = true;
            }
          }
          let idx = 0;
          for (const output of tx.txComplete.body().outputs().to_js_value()) {
            const ref = `${tx.toHash()}#${idx}`;
            if (!this.tombstones[ref]) {
              this.utxos[ref] = hydraUtxoToLucidUtxo(tx.toHash(), idx, output);
            }
            idx++;
          }
          this.onTxSeen?.(txid, tx);
        }
        break;
      case "TxInvalid":
        {
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
    };
  }

  public queueTx(tx: Transaction, txId: TxHash) {
    this.outbound_transactions.push([tx, txId]);
    if (this.outbound_transactions.length > this.queue_length) {
      console.warn(
        `Outbound transaction queue (${this.outbound_transactions.length}) is above configured threshold (${this.queue_length})`,
      );
    }
  }
  public async submitTx(tx: Transaction): Promise<string> {
    const txParsed = tx_parser.fromTx(tx);
    const txId = txParsed.toHash();
    this.queueTx(tx, txId);
    await this.awaitTx(txId);
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
      let start = performance.now();
      await this.populateUTxO();
      timeout -= performance.now() - start;
      if (timeout <= 0) {
        throw new Error("Timeout waiting for UTXO");
      }
    }
  }

  public async getUtxos(
    address: Address
  ): Promise<UTxO[]> {
    const ret = [];
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
    if (addressOrCredential instanceof Credential) {
      throw new Error("not implemented");
    }
    const ret = [];
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
    let ret = [];
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
        const hash = utils.datumToHash(this.utxos[txRef].datum!);
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
    assets: assets,
  };
}
