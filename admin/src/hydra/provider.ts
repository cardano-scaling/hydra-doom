import {
  ProtocolParameters,
  Address,
  TransactionUnspentOutput,
  AssetId,
  TransactionInput,
  TransactionOutput,
  DatumHash,
  PlutusData,
  TransactionId,
  Transaction,
  Redeemers,
  NetworkId,
  Datum,
  hardCodedProtocolParams,
  toHex,
  Value,
} from "@blaze-cardano/core";
import { Provider } from "@blaze-cardano/sdk";

export class HydraProvider extends Provider {
  url: URL;
  connection: WebSocket;

  constructor(
    url: string,
    networkId: NetworkId,
    filterAddress?: string,
    onConnect?: () => void,
    onDisconnect?: () => void,
  ) {
    super(networkId);

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

  async getParameters(): Promise<ProtocolParameters> {
    const resp = await fetch(`${this.url}protocol-parameters`);
    const rawParams = await resp.json();
    return {
      minFeeConstant: rawParams.txFeeFixed,
      minFeeCoefficient: rawParams.txFeePerByte,
      maxTxSize: rawParams.maxTxSize,
      maxValueSize: rawParams.maxValueSize,
      stakeKeyDeposit: rawParams.stakeAddressDeposit,
      poolDeposit: rawParams.stakePoolDeposit,
      prices: {
        memory: rawParams.executionUnitPrices.priceMemory,
        steps: rawParams.executionUnitPrices.priceSteps,
      },
      maxExecutionUnitsPerTransaction: {
        memory: rawParams.maxTxExecutionUnits.memory,
        steps: rawParams.maxTxExecutionUnits.steps,
      },
      coinsPerUtxoByte: rawParams.utxoCostPerByte,
      collateralPercentage: rawParams.collateralPercentage,
      maxCollateralInputs: rawParams.maxCollateralInputs,
      costModels: rawParams.costModels,
      minFeeReferenceScripts: rawParams.minfeeRefscriptCostPerByte
        ? {
            ...hardCodedProtocolParams.minFeeReferenceScripts!,
            base: rawParams.minfeeRefscriptCostPerByte,
          }
        : undefined,
      poolRetirementEpochBound: rawParams.poolRetireMaxEpoch,
      desiredNumberOfPools: rawParams.stakePoolTargetNum,
      poolInfluence: rawParams.poolPledgeInfluence,
      monetaryExpansion: rawParams.monetaryExpansion,
      treasuryExpansion: rawParams.treasuryCut,
      minPoolCost: rawParams.minPoolCost,
      protocolVersion: rawParams.protocolVersion,
      maxExecutionUnitsPerBlock: {
        memory: rawParams.maxBlockExecutionUnits.memory,
        steps: rawParams.maxBlockExecutionUnits.steps,
      },
      maxBlockBodySize: rawParams.maxBlockBodySize,
      maxBlockHeaderSize: rawParams.maxBlockHeaderSize,
    };
  }

  async getUnspentOutputs(
    address: Address,
  ): Promise<TransactionUnspentOutput[]> {
    const utxos = await this.fetchUTxOs();

    const ret: TransactionUnspentOutput[] = [];
    for (const key in utxos) {
      const utxo = utxos[key];
      if (utxo.output().address().toBech32() === address.toBech32()) {
        ret.push(utxo);
      }
    }

    return Promise.resolve(ret);
  }

  async getUnspentOutputsWithAsset(
    address: Address,
    unit: AssetId,
  ): Promise<TransactionUnspentOutput[]> {
    const utxos = await this.fetchUTxOs();

    const ret: TransactionUnspentOutput[] = [];
    for (const key in utxos) {
      const utxo = utxos[key];
      if (utxo.output().amount().multiasset().has(unit)) {
        ret.push(utxo);
      }
    }

    return Promise.resolve(ret);
  }

  /**
   * This method fetches the UTxO that holds a particular NFT given as an argument
   * It does **NOT** gaurantee the uniqueness of the NFT.
   * It is just like `getUnspentOutputsWithAsset`, except it short circuits and returns the first UTxO containing the unit
   * @param unit - the AssetId of the NFT
   * @returns A promise that resolves to the UTxO
   */
  async getUnspentOutputByNFT(
    unit: AssetId,
  ): Promise<TransactionUnspentOutput> {
    const utxos = await this.fetchUTxOs();

    for (const key in utxos) {
      const utxo = utxos[key];
      if (utxo.output().amount().multiasset().has(unit)) {
        return utxo;
      }
    }

    throw new Error("UTxO not found");
  }

  async resolveUnspentOutputs(
    txIns: TransactionInput[],
  ): Promise<TransactionUnspentOutput[]> {
    const utxos = await this.fetchUTxOs();

    const ret: TransactionUnspentOutput[] = [];
    for (const txIn of txIns) {
      const utxo: TransactionUnspentOutput | undefined =
        utxos[`${txIn.transactionId()}#${txIn.index()}`];
      if (!utxo) {
        throw new Error(
          `Failed to resolve transaction: ${txIn.transactionId()}#${txIn.index()}`,
        );
      }

      ret.push(utxo);
    }

    return ret;
  }

  resolveDatum(datumHash: DatumHash): Promise<PlutusData> {
    throw new Error("Not supported in Hydra API.");
  }

  async awaitTransactionConfirmation(
    txId: TransactionId,
    timeout?: number,
  ): Promise<boolean> {
    const averageBlockTime = 20_000;

    if (timeout && timeout < averageBlockTime) {
      console.log("Warning: timeout given is less than average block time.");
    }

    const startTime = Date.now();

    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    const checkConfirmation = async () => {
      const resp = await fetch(`${this.url}snapshot/utxo`);
      const rawUtxo = await resp.json();
      return !!Object.keys(rawUtxo).find(
        (txRef) => txRef.split("#")[0] === txId,
      );
    };

    if (await checkConfirmation()) {
      return true;
    }

    if (timeout) {
      while (Date.now() - startTime < timeout) {
        await delay(averageBlockTime);

        if (await checkConfirmation()) {
          return true;
        }
      }
    }

    return false;
  }

  async postTransactionToChain(tx: Transaction): Promise<TransactionId> {
    const txId = tx.body().hash();
    this.connection.send(
      JSON.stringify({
        tag: "NewTx",
        transaction: {
          type: "Tx BabbageEra",
          cborHex: tx.toCbor(),
        },
      }),
    );

    return txId;
  }
  evaluateTransaction(
    tx: Transaction,
    additionalUtxos: TransactionUnspentOutput[],
  ): Promise<Redeemers> {
    throw new Error("Unsupported by the Hydra API");
  }

  async fetchUTxOs(): Promise<{ [txRef: string]: TransactionUnspentOutput }> {
    const utxos = {};
    const resp = await fetch(`${this.url}snapshot/utxo`);
    const rawUtxo = await resp.json();
    for (const key in rawUtxo) {
      const [txHash, idx] = key.split("#");
      const output = rawUtxo[key];
      utxos[key] = this.hydraUtxoToTransactionUnspentOutput(
        txHash,
        parseInt(idx),
        output,
      );
    }

    return utxos;
  }

  hydraUtxoToTransactionUnspentOutput(
    txHash: string,
    idx: number,
    output: any,
  ): TransactionUnspentOutput {
    const address = Address.fromBech32(output.address);
    const value = output.amount
      ? new Value(BigInt(output.amount.coin ?? 0), output.amount.multiasset)
      : new Value(BigInt(output.value.lovelace ?? 0));
    const txOut = new TransactionOutput(address, value);

    const datumBytes = output.datum?.Data?.original_bytes
      ? toHex(output.datum.Data.original_bytes)
      : output.inlineDatum?.Data?.original;

    if (datumBytes) {
      const datum = new Datum(
        output.inlineDatumHash,
        PlutusData.fromCbor(datumBytes),
      );

      txOut.setDatum(datum);
    }
    // TODO: Script ref

    const txIn = new TransactionInput(TransactionId(txHash), BigInt(idx));
    return new TransactionUnspentOutput(txIn, txOut);
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
            console.log("TxValid", data);
          }
          break;
        case "TxInvalid":
          {
            console.error("TxInvalid", data);
          }
          break;
        case "SnapshotConfirmed":
          {
            console.log("SnapshotConfirmed", data);
          }
          break;
        default:
          console.warn("Unexpected message: " + JSON.stringify(data));
      }
    } catch (err) {
      console.warn(err);
    }
  }
}
