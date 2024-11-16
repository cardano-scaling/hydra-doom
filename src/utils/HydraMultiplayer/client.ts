import { fromHex, toHex, UTxO, C } from "lucid-cardano";

import { blake2b } from "@noble/hashes/blake2b";
import { EmscriptenModule } from "../../types";
import { HydraMultiplayer } from "./base";

export class HydraMultiplayerClient extends HydraMultiplayer {
  // outboundScript is ANY(player, admin) native script
  outboundScript: { cbor: string; address: string; hash: string };

  constructor({
    key,
    adminPkh,
    filterAddress,
    url,
    module,
  }: {
    key: {
      publicKey: string;
      publicKeyHash: string;
      privateKeyBytes: Uint8Array;
    };
    adminPkh: string;
    filterAddress?: string;
    url: string;
    module: EmscriptenModule;
  }) {
    super({ key, url, module, filterAddress });
    this.outboundScript = getNativeScript(key.publicKeyHash, adminPkh, 0);
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

  public override async SendPacket(
    to: number,
    from: number,
    data: Uint8Array,
  ): Promise<void> {
    this.packetQueue.push({ to, from, data });
    await this.sendPacketQueue();
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
      `0181a300581d70${this.outboundScript.hash}018200a0028201d818${lengthLengthTag}${datumLengthHex}${datum}` + // Output to (player || admin) native script
      `0200`; // No fee

    const txId = toHex(blake2b(fromHex(txBodyByHand), { dkLen: 256 / 8 }));

    const witnessSetByHand = `a20081825820${this.key.publicKey}5840${this.signData(txId)}0181${this.outboundScript.cbor}`; // signed by the user with the provided native script
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
  const script = C.NativeScript.from_bytes(fromHex(cbor));
  const scriptHash = script.hash(C.ScriptHashNamespace.NativeScript);
  const scriptHashBytes = new Uint8Array([
    0b01110000 | networkId,
    ...scriptHash.to_bytes(),
  ]);
  const address = C.Address.from_bytes(scriptHashBytes);
  const stringAddress = address.to_bech32(undefined);
  const stringScriptHash = scriptHash.to_hex();

  script.free();
  scriptHash.free();
  address.free();

  return { cbor, address: stringAddress, hash: stringScriptHash };
};
