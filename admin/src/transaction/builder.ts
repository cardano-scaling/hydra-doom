import {
  Blaze,
  Data,
  Core,
  Wallet,
  Provider,
  Static,
} from "@blaze-cardano/sdk";
import * as contracts from "./finale-manager.js";

const PacketSchema = Data.Object({
  to: Data.Integer(),
  from: Data.Integer(),
  state: Data.Enum([
    Data.Literal("Lobby"),
    Data.Literal("Running"),
    Data.Literal("Cheated"),
    Data.Literal("Finished"),
    Data.Literal("Aborted"),
  ]),
  ephemeralKey: Data.Bytes(),
  kills: Data.Array(Data.Integer()),
  data: Data.Bytes(),
});

type TPacket = Static<typeof PacketSchema>;
const Packet = PacketSchema as unknown as TPacket;

export class TransactionBuilder {
  contract: Core.Script;
  address: Core.Address;
  constructor(
    public blaze: Blaze<Provider, Wallet>,
    public policyId: string,
    public adminKeyHash: string,
    public networkId: number,
  ) {
    this.contract = new contracts.FinaleManagerSpend(this.policyId, {
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
    utxo: Core.TransactionUnspentOutput,
    pkhs: string[],
  ): Promise<Core.Transaction> {
    const multiasset = utxo.output().amount().multiasset();
    const nftNames: string[] = [];
    for (const assetId in multiasset) {
      nftNames.push(assetId.substring(64));
    }

    const datum = Data.to(
      {
        finishedGames: 0n,
        kills: [0n, 0n, 0n, 0n],
        pkhs,
        nftNames,
      },
      contracts.FinaleManagerSpend.datum,
    );

    const tx = this.blaze
      .newTransaction()
      .setFeePadding(0n)
      .setMinimumFee(0n)
      .addInput(utxo)

      .lockAssets(this.address, utxo.output().amount(), datum);

    (tx as any)["fee"] = 0;
    return await tx.complete();
  }

  async storeGame(
    utxo: Core.TransactionUnspentOutput,
    gameUtxos: Core.TransactionUnspentOutput[],
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
      const packet = Data.from(gameDatum, PacketSchema);
      const address = Core.fromHex(gameUtxo.output().address().toBytes());
      const pkh = address.subarray(1);
      const index = pkhs.indexOf(Core.toHex(pkh));
      kills[index] = kills[index] + packet.kills[packet.from];
    }

    const tx = this.blaze
      .newTransaction()
      .addInput(utxo)
      .lockAssets(this.address, utxo.output().amount(), datum)
      .provideScript(this.contract);
    gameUtxos.forEach(tx.addReferenceInput);

    (tx as any)["fee"] = 0;

    return await tx.complete();
  }

  async distribute(
    utxo: Core.TransactionUnspentOutput,
    changeAddress: Core.Address,
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

    const tx = this.blaze
      .newTransaction()
      .addInput(utxo)
      .provideScript(this.contract);

    playerKills.forEach(([pkhHex, _], i) => {
      const pkh = Core.fromHex(pkhHex);
      const addressBytes = Core.HexBlob.fromBytes(
        Uint8Array.from([0b0110 | this.networkId, ...pkh]),
      );
      const address = Core.Address.fromBytes(addressBytes);
      const policyId = Core.PolicyId(this.policyId);
      const assetName = Core.AssetName(seriesState.nftNames[i]);

      const assetId = Core.AssetId.fromParts(policyId, assetName);
      const value = new Core.Value(1_500_000n, new Map([[assetId, 1n]]));
      tx.payAssets(address, value);
    });

    (tx as any)["fee"] = 0;

    return await tx.complete();
  }
}
