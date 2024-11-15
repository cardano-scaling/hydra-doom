import { fromHex, toHex, UTxO } from "lucid-cardano";
import { HydraMultiplayer } from "./base";
import { EmscriptenModule } from "../../types";
import { blake2b } from "@noble/hashes/blake2b";

export class HydraMultiplayerServer extends HydraMultiplayer {
  address: string;

  constructor({
    key,
    address,
    url,
    module,
  }: {
    key: { pkh: string; privateKeyBytes: Uint8Array };
    address: string;
    url: string;
    module: EmscriptenModule;
  }) {
    super({ key, url, module });
    this.address = address;
  }
  public override async SendPacket(
    to: number,
    from: number,
    data: Uint8Array,
  ): Promise<void> {
    this.packetQueue.push({ to, from, data });
  }

  public override async selectUTxO(): Promise<void> {
    if (this.latestUTxO) {
      return;
    }
    await this.hydra.populateUTxO();
    const utxos = await this.hydra.getUtxos(this.address);
    // TODO:
    // there are two addresses at the admin pkh
    // One is the UTxO from the initial state that is maintained
    // The other is the 0 ada UTxO created during the new game transaction
    // If we want to ensure we don't spend the initial state utxo,
    // we need to add something identifying for the "admin UTxO" (perhaps a datum)
    this.latestUTxO = utxos.find((u) => !u.datumHash)!;
  }
  protected override buildTx(datum: string): [UTxO, string] {
    if (!this.latestUTxO) {
      throw new Error("No latest UTxO");
    }
    const datumLength = datum.length / 2;
    let datumLengthHex = datumLength.toString(16);
    if (datumLengthHex.length % 2 !== 0) {
      datumLengthHex = "0" + datumLengthHex;
    }
    const lengthLengthTag = 57 + datumLengthHex.length / 2;
    const txBodyByHand =
      `a3` + // Prefix
      `0081825820${this.latestUTxO.txHash}0${this.latestUTxO.outputIndex}` + // One input
      `0181a300581d60${this.key.pkh}018200a0028201d818${lengthLengthTag}${datumLengthHex}${datum}` + // Single output to self
      `0200`; // No fee

    const txId = toHex(blake2b(fromHex(txBodyByHand), { dkLen: 256 / 8 }));

    const witnessSetByHand = `a10081825820${this.key.pkh}5840${this.signData(txId)}`; // just signed by self
    const txByHand = `84${txBodyByHand}${witnessSetByHand}f5f6`;

    const newUtxo: UTxO = {
      txHash: txId,
      outputIndex: 0,
      address: this.address,
      assets: { lovelace: 0n },
      datumHash: null,
      datum: datum,
      scriptRef: null,
    };

    return [newUtxo, txByHand];
  }
}
