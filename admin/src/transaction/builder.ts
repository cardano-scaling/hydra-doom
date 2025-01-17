import {
  Blaze,
  Data,
  Core,
  Wallet,
  Provider,
  Static,
  Value,
} from "@blaze-cardano/sdk";
import * as contracts from "./finale-manager.js";

export const PacketSchema = Data.Object({
  to: Data.Integer(),
  from: Data.Integer(),
  ephemeralKey: Data.Bytes(),
  kills: Data.Array(Data.Integer()),
  state: Data.Enum([
    Data.Literal("Lobby"),
    Data.Literal("Running"),
    Data.Literal("Cheated"),
    Data.Literal("Finished"),
    Data.Literal("Aborted"),
  ]),
  data: Data.Bytes(),
});

export type TPacket = Static<typeof PacketSchema>;
export const Packet = PacketSchema as unknown as TPacket;

export class TransactionBuilder {
  contract: Core.Script;
  address: Core.Address;
  constructor(
    public blaze: Blaze<Provider, Wallet>,
    public adminKeyHash: string,
    public networkId: number,
  ) {
    this.contract = new contracts.FinaleManagerSpend({
      VerificationKey: [this.adminKeyHash],
    });

    this.address = new Core.Address({
      type: Core.AddressType.EnterpriseScript,
      networkId: networkId,
      paymentPart: {
        type: Core.CredentialType.ScriptHash,
        hash: this.contract.hash(),
      },
    });
  }

  async newSeries(
    utxos: Core.TransactionUnspentOutput[],
    pkhs: string[],
    policies: string[],
  ): Promise<Core.Transaction> {
    const multiasset = new Map();

    utxos.forEach((utxo) =>
      utxo
        .output()
        .amount()
        .multiasset()
        .forEach((value, key) => multiasset.set(key, value)),
    );

    const datum = Data.to(
      {
        finishedGames: 0n,
        kills: [0n, 0n, 0n, 0n],
        pkhs,
        policies,
      },
      contracts.FinaleManagerSpend.datum,
    );

    const tx = this.blaze
      .newTransaction()
      .lockAssets(this.address, new Core.Value(20_000_000n, multiasset), datum);
    utxos.forEach((utxo) => tx.addInput(utxo));

    (tx as any)["fee"] = 0;

    return await tx.complete();
  }

  async storeGame(
    utxo: Core.TransactionUnspentOutput,
    gameUtxos: Core.TransactionUnspentOutput[],
    signer: Core.Address,
  ): Promise<Core.Transaction> {
    const datum = Core.PlutusData.fromCore(
      utxo.output().datum().asInlineData().toCore(),
    );
    const seriesState = Data.from(datum, contracts.FinaleManagerSpend.datum);
    const kills: bigint[] = seriesState.kills;
    const pkhs: string[] = seriesState.pkhs;
    for (const gameUtxo of gameUtxos) {
      const gameDatum = Core.PlutusData.fromCore(
        gameUtxo.output().datum().asInlineData().toCore(),
      );
      console.log(gameDatum.toCbor());
      const packet = Data.from(gameDatum, PacketSchema);
      const address = Core.fromHex(gameUtxo.output().address().toBytes());
      const pkh = address.subarray(1);
      const index = pkhs.indexOf(Core.toHex(pkh));
      kills[index] = kills[index] + packet.kills[index];
    }

    seriesState.finishedGames += 1n;
    console.log("new series state", seriesState);
    const newDatum = Data.to(seriesState, contracts.FinaleManagerSpend.datum);
    console.log(newDatum.toCbor());
    const redeemer = Data.to(
      "StoreGame",
      contracts.FinaleManagerSpend.redeemer,
    );
    const tx = this.blaze
      .newTransaction()
      .addInput(utxo, redeemer)
      .lockAssets(this.address, utxo.output().amount(), newDatum)
      .provideScript(this.contract)
      .addRequiredSigner(
        Core.Ed25519KeyHashHex(
          signer.asEnterprise().getPaymentCredential().hash,
        ),
      );
    gameUtxos.forEach((utxo) => tx.addReferenceInput(utxo));
    (tx as any)["fee"] = 0;

    return await tx.complete();
  }

  async distribute(
    utxo: Core.TransactionUnspentOutput,
    requiredSigner: string,
  ) {
    // Order a [players, kills] set by kills
    // Create outputs for each player such that they get the asset that represents their position in that set
    const datum = Core.PlutusData.fromCore(
      utxo.output().datum().asInlineData().toCore(),
    );
    const seriesState = Data.from(datum, contracts.FinaleManagerSpend.datum);

    const playerKills: [string, bigint][] = seriesState.pkhs.map((pkh, i) => [
      pkh,
      seriesState.kills[i],
    ]);
    playerKills.sort(([_, a], [__, b]) => {
      if (a > b) return -1;
      else if (b > a) return 1;
      else return 0;
    });

    const redeemer = Data.to(
      "Distribute",
      contracts.FinaleManagerSpend.redeemer,
    );
    const tx = this.blaze
      .newTransaction()
      .addInput(utxo, redeemer)
      .provideScript(this.contract)
      .addRequiredSigner(Core.Ed25519KeyHashHex(requiredSigner));

    const assets = utxo.output().amount().multiasset()!;
    playerKills.forEach(([pkhHex, _], i) => {
      const address = Core.Address.fromBytes(Core.HexBlob("60" + pkhHex));
      const policyId = seriesState.policies[i];
      console.log("policy = ", policyId);

      const asset = Object.keys(assets).find((assetId) =>
        assetId.startsWith(policyId),
      );
      const assetId = Core.AssetId(asset);
      const value = new Core.Value(0n, new Map([[assetId, 1n]]));
      tx.payAssets(address, value);
    });

    (tx as any)["fee"] = 0;

    return await tx.complete();
  }
}
