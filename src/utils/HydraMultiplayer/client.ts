import { Core } from "@blaze-cardano/sdk";
import { blake2b } from "@noble/hashes/blake2b";

import { EmscriptenModule, Keys, UTxO } from "../../types";
import { HydraMultiplayer } from "./base";
import { fromHex, toHex } from "../helpers";

export class HydraMultiplayerClient extends HydraMultiplayer {
  // outboundScript is ANY(player, admin) native script
  outboundScript: { cbor: string; address: string; hash: string };

  constructor({
    key,
    adminPkh,
    filterAddress,
    url,
    module,
    networkId = 0,
  }: {
    key: Keys;
    adminPkh: string;
    filterAddress?: string;
    url: string;
    module: EmscriptenModule;
    networkId: number;
  }) {
    super({ key, url, module, filterAddress, networkId });
    this.outboundScript = getNativeScript(
      key.publicKeyHashHex,
      adminPkh,
      networkId,
    );

    console.log(this.outboundScript.address);
  }

  public override async selectUTxO(): Promise<void> {
    if (this.latestUTxO) {
      return;
    }
    await this.hydra.populateUTxO();
    const utxos = await this.hydra.getUtxos(this.outboundScript.address);
    // TODO: robust
    this.latestUTxO = utxos.find((u) => !u.datumHash)!;
  }

  protected override buildTx(datum: string): [UTxO, string] {
    if (!this.latestUTxO) {
      throw new Error("No latest UTxO");
    }
    // Hand-roll transaction creation for more performance
    const datumLength = datum.length / 2;
    let datumLengthHex = datumLength.toString(16);
    if (datumLengthHex.length % 2 !== 0) {
      datumLengthHex = "0" + datumLengthHex;
    }
    const lengthLengthTag = 57 + datumLengthHex.length / 2;
    const txBodyByHand =
      `a3` + // Prefix
      `0081825820${this.latestUTxO!.txHash}0${this.latestUTxO!.outputIndex}` + // One input
      `0181a300581d${this.networkId === 0 ? "70" : "71"}${this.outboundScript.hash}018200a0028201d818${lengthLengthTag}${datumLengthHex}${datum}` + // Output to (player || admin) native script
      `0200`; // No fee

    const txId = toHex(blake2b(fromHex(txBodyByHand), { dkLen: 256 / 8 }));

    const witnessSetByHand = `a20081825820${this.key.publicKeyHex}5840${this.signData(txId)}0181${this.outboundScript.cbor}`; // signed by the user with the provided native script
    const txByHand = `84${txBodyByHand}${witnessSetByHand}f5f6`;

    const newUtxo: UTxO = {
      txHash: txId,
      outputIndex: 0,
      address: this.outboundScript.address,
      assets: { lovelace: 0n },
      datumHash: null,
      datum: datum,
      scriptRef: null,
    };

    return [newUtxo, txByHand];
  }
}

const getNativeScript = (
  playerPkh: string,
  adminPkh: string,
  networkId: number,
): { cbor: string; address: string; hash: string } => {
  const cbor = `8202828200581c${playerPkh}8200581c${adminPkh}`;
  const script = Core.NativeScript.fromCbor(Core.HexBlob(cbor));
  const scriptHash = script.hash();
  const address = Core.addressFromCredential(
    networkId,
    Core.Credential.fromCore({
      hash: scriptHash,
      type: Core.CredentialType.ScriptHash,
    }),
  );
  const stringAddress = address.toBech32();
  const stringScriptHash = scriptHash;

  return { cbor, address: stringAddress, hash: stringScriptHash };
};
