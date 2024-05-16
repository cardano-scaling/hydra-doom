import {
  Address,
  Assets,
  Credential,
  Datum,
  DatumHash,
  Delegation,
  OutRef,
  ProtocolParameters,
  Provider,
  RewardAddress,
  Transaction,
  TxHash,
  Unit,
  UTxO,
} from "lucid-cardano";

export class HydraProvider implements Provider {
  apiUrl: string;

  constructor(apiUrl: string) {
    console.log("HydraProvider", apiUrl);
    this.apiUrl = apiUrl;
  }

  async getProtocolParameters(): Promise<ProtocolParameters> {
    const pp = await fetch(`${this.apiUrl}/protocol-parameters`).then((res) =>
      res.json(),
    );
    console.log(pp);
    return {
      minFeeA: pp.txFeeFixed,
      minFeeB: pp.txFeePerByte,
      maxTxSize: pp.maxTxSize,
      maxValSize: pp.maxValueSize,
      keyDeposit: pp.stakeAddressDeposit,
      poolDeposit: pp.stakePoolDeposit,
      priceMem: pp.executionUnitPrices.priceMemory,
      priceStep: pp.executionUnitPrices.priceSteps,
      maxTxExMem: pp.maxTxExecutionUnits.memory,
      maxTxExSteps: pp.maxTxExecutionUnits.steps,
      coinsPerUtxoByte: pp.utxoCostPerByte,
      collateralPercentage: pp.collateralPercentage,
      maxCollateralInputs: pp.maxCollateralInputs,
      costModels: pp.costModels,
    };
  }

  async getUtxos(addressOrCredential: Address | Credential): Promise<UTxO[]> {
    // TODO: implement
    return [];
  }

  async getUtxosWithUnit(
    addressOrCredential: Address | Credential,
    unit: Unit,
  ): Promise<UTxO[]> {
    // TODO: implement
    return [];
  }

  async getUtxoByUnit(unit: Unit): Promise<UTxO> {
    // TODO: implement
    throw new Error("not implemented");
  }

  async getUtxosByOutRef(outRefs: Array<OutRef>): Promise<UTxO[]> {
    // TODO: implement
    return [];
  }

  awaitTx(txHash: TxHash, checkInterval = 3000): Promise<boolean> {
    // TODO: implement
    throw new Error("not implemented");
  }

  async submitTx(tx: Transaction): Promise<TxHash> {
    // throw new Error("not implemented");
    return new Promise((res, rej) => {
      // TODO: create a HTTP based submission endpoint and/or re-use this websocket
      const wsUrl = this.apiUrl.replace("http", "ws") + "?history=no";
      console.log(wsUrl);
      const conn = new WebSocket(wsUrl);
      conn.addEventListener("message", (e) => {
        const msg = JSON.parse(e.data);
        switch (msg.tag) {
          case "Greetings":
            break;
          // FIXME: resolve promise on TxValid
          case "TxInvalid":
            rej("Transaction invalid: " + msg.validationError.reason);
            break;
          default:
            rej("Unexpected message: " + e.data);
        }
      });
      conn.addEventListener("open", () => {
        conn.send(
          JSON.stringify({
            tag: "NewTx",
            transaction: {
              type: "Tx BabbageEra",
              cborHex: tx,
            },
          }),
        );
      });
    });
  }

  getDatum(datumHash: DatumHash): Promise<Datum> {
    // TODO: implement
    throw new Error("not implemented");
  }

  getDelegation(rewardAddress: string): Promise<Delegation> {
    // TODO: implement
    throw new Error("not implemented");
  }
}
