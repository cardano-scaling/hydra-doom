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
    this.apiUrl = apiUrl;
  }

  async getProtocolParameters(): Promise<ProtocolParameters> {
    // const client = await this.ogmiosWsp("Query", {
    //   query: "currentProtocolParameters",
    // });

    return new Promise((res, rej) => {
      // client.addEventListener(
      //   "message",
      //   (msg: MessageEvent<string>) => {
      //     try {
      //       const { result } = JSON.parse(msg.data);
      //       // deno-lint-ignore no-explicit-any
      //       const costModels: any = {};
      //       Object.keys(result.costModels).forEach((v) => {
      //         const version = v.split(":")[1].toUpperCase();
      //         const plutusVersion = "Plutus" + version;
      //         costModels[plutusVersion] = result.costModels[v];
      //       });
      //       const [memNum, memDenom] = result.prices.memory.split("/");
      //       const [stepsNum, stepsDenom] = result.prices.steps.split("/");
      //       res({
      //         minFeeA: parseInt(result.minFeeCoefficient),
      //         minFeeB: parseInt(result.minFeeConstant),
      //         maxTxSize: parseInt(result.maxTxSize),
      //         maxValSize: parseInt(result.maxValueSize),
      //         keyDeposit: BigInt(result.stakeKeyDeposit),
      //         poolDeposit: BigInt(result.poolDeposit),
      //         priceMem: parseInt(memNum) / parseInt(memDenom),
      //         priceStep: parseInt(stepsNum) / parseInt(stepsDenom),
      //         maxTxExMem: BigInt(result.maxExecutionUnitsPerTransaction.memory),
      //         maxTxExSteps: BigInt(
      //           result.maxExecutionUnitsPerTransaction.steps,
      //         ),
      //         coinsPerUtxoByte: BigInt(result.coinsPerUtxoByte),
      //         collateralPercentage: parseInt(result.collateralPercentage),
      //         maxCollateralInputs: parseInt(result.maxCollateralInputs),
      //         costModels,
      //       });
      //       client.close();
      //     } catch (e) {
      //       rej(e);
      //     }
      //   },
      //   { once: true },
      // );
    });
  }

  async getUtxos(addressOrCredential: Address | Credential): Promise<UTxO[]> {
    // const isAddress = typeof addressOrCredential === "string";
    // const queryPredicate = isAddress
    //   ? addressOrCredential
    //   : addressOrCredential.hash;
    // const result = await fetch(
    //   `${this.kupoUrl}/matches/${queryPredicate}${
    //     isAddress ? "" : "/*"
    //   }?unspent`,
    // ).then((res) => res.json());
    // return this.kupmiosUtxosToUtxos(result);
    return new Promise((res, rej) => {
      res([]);
    });
  }

  async getUtxosWithUnit(
    addressOrCredential: Address | Credential,
    unit: Unit,
  ): Promise<UTxO[]> {
    // const isAddress = typeof addressOrCredential === "string";
    // const queryPredicate = isAddress
    //   ? addressOrCredential
    //   : addressOrCredential.hash;
    // const { policyId, assetName } = fromUnit(unit);
    // const result = await fetch(
    //   `${this.kupoUrl}/matches/${queryPredicate}${
    //     isAddress ? "" : "/*"
    //   }?unspent&policy_id=${policyId}${
    //     assetName ? `&asset_name=${assetName}` : ""
    //   }`,
    // ).then((res) => res.json());
    // return this.kupmiosUtxosToUtxos(result);
    return new Promise((res, rej) => {
      res([]);
    });
  }

  async getUtxoByUnit(unit: Unit): Promise<UTxO> {
    // const { policyId, assetName } = fromUnit(unit);
    // const result = await fetch(
    //   `${this.kupoUrl}/matches/${policyId}.${
    //     assetName ? `${assetName}` : "*"
    //   }?unspent`,
    // ).then((res) => res.json());

    // const utxos = await this.kupmiosUtxosToUtxos(result);

    // if (utxos.length > 1) {
    //   throw new Error("Unit needs to be an NFT or only held by one address.");
    // }

    // return utxos[0];
    return new Promise((res, rej) => {});
  }

  async getUtxosByOutRef(outRefs: Array<OutRef>): Promise<UTxO[]> {
    // const queryHashes = [...new Set(outRefs.map((outRef) => outRef.txHash))];

    // const utxos = await Promise.all(
    //   queryHashes.map(async (txHash) => {
    //     const result = await fetch(
    //       `${this.kupoUrl}/matches/*@${txHash}?unspent`,
    //     ).then((res) => res.json());
    //     return this.kupmiosUtxosToUtxos(result);
    //   }),
    // );

    // return utxos
    //   .reduce((acc, utxos) => acc.concat(utxos), [])
    //   .filter((utxo) =>
    //     outRefs.some(
    //       (outRef) =>
    //         utxo.txHash === outRef.txHash &&
    //         utxo.outputIndex === outRef.outputIndex,
    //     ),
    //   );
    return new Promise((res, rej) => {
      res([]);
    });
  }

  awaitTx(txHash: TxHash, checkInterval = 3000): Promise<boolean> {
    return new Promise((res) => {
      // const confirmation = setInterval(async () => {
      //   const isConfirmed = await fetch(
      //     `${this.kupoUrl}/matches/*@${txHash}?unspent`,
      //   ).then((res) => res.json());
      //   if (isConfirmed && isConfirmed.length > 0) {
      //     clearInterval(confirmation);
      //     await new Promise((res) => setTimeout(() => res(1), 1000));
      //     return res(true);
      //   }
      // }, checkInterval);
    });
  }

  async submitTx(tx: Transaction): Promise<TxHash> {
    // const client = await this.ogmiosWsp("SubmitTx", {
    //   submit: tx,
    // });

    return new Promise((res, rej) => {
      // client.addEventListener(
      //   "message",
      //   (msg: MessageEvent<string>) => {
      //     try {
      //       const { result } = JSON.parse(msg.data);
      //       if (result.SubmitSuccess) res(result.SubmitSuccess.txId);
      //       else rej(result.SubmitFail);
      //       client.close();
      //     } catch (e) {
      //       rej(e);
      //     }
      //   },
      //   { once: true },
      // );
    });
  }

  getDatum(datumHash: DatumHash): Promise<Datum> {
    return new Promise((res, rej) => {});
  }

  getDelegation(rewardAddress: string): Promise<Delegation> {
    return new Promise((res, rej) => {});
  }
}
