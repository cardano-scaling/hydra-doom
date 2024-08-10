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

  tx_timings: {
    [tx: string]: TransactionTiming;
  };

  constructor(
    public url: string | URL,
    public queue_length: number = 10,
  ) {
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

  // TODO: busy loop?
  public async startEventLoop() {
    if (this.interval) {
      return;
    }
    this.interval = setInterval(async () => this.resendTransactions(), 1);
  }

  // Keep track of outbound_transactions and resend if needed
  resendTransactions() {
    const now = performance.now();
    if (this.outbound_transactions.length === 0) {
      return;
    }
    const [tx, txId] = this.outbound_transactions[0];

    // Transaction should have been sent
    if (!this.tx_timings[txId]) {
      // TODO: merge outbound_transactions with tx_timings to avoid inconsistencies
      throw new Error("resendTransactions: inconsistent tx_timings");
    }

    // We have seen this transaction, so we can shift it off the outbound transactions
    if (this.tx_timings[txId].seen) {
      this.outbound_transactions.shift();
      return;
    }

    // Transaction was invalid, try to resubmit
    if (this.tx_timings[txId].invalid) {
      // TODO: maximum number of retries using sent time
      console.warn(`Resubmitting invalid transaction: ${txId}`);
      this.connection.send(
        JSON.stringify({
          tag: "NewTx",
          transaction: {
            type: "Tx BabbageEra",
            cborHex: tx,
          },
        }),
      );
      this.tx_timings[txId].invalid = undefined;
      return;
    }

    // REVIEW: what does ?? do?
    if (this.tx_timings[txId]?.seen ?? now < now - 500) {
      // We have been waiting a half second for this tx to be seen, so log a warning
      console.warn(`Transaction not seen within 500ms: ${txId}`);
      return;
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
          console.log("TxValid", txid);
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
          console.error("TxInvalid", data);
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
          console.log("SnapshotConfirmed", data.snapshot.number);
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
    // Submit tx right away, but also keep in outbound transactions for potential resubmission
    this.tx_timings[txId] = {
      sent: performance.now(),
    };
    this.connection.send(
      JSON.stringify({
        tag: "NewTx",
        transaction: {
          type: "Tx BabbageEra",
          cborHex: tx,
        },
      }),
    );
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
    addressOrCredential: Address | Credential,
  ): Promise<UTxO[]> {
    if (addressOrCredential instanceof Credential) {
      throw new Error("not implemented");
    }
    const ret = [];
    for (const key in this.utxos) {
      const utxo = this.utxos[key];
      if (utxo.address === addressOrCredential) {
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
        lovelace: output.amount.coin ?? 0n,
        ...output.amount.multiasset,
      }
    : {
        lovelace: output.value.lovelace ?? 0n,
      };
  return {
    address: output.address,
    txHash: txHash,
    outputIndex: idx,
    datum: datumBytes,
    assets: assets,
  };
}
