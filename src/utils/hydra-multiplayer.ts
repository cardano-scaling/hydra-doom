import {
  Constr,
  Data,
  fromHex,
  toHex,
  TxComplete,
  TxHash,
  UTxO,
  C,
} from "lucid-cardano";
import { Hydra } from "./hydra";

import * as ed25519 from "@noble/ed25519";
import { blake2b } from "@noble/hashes/blake2b";
import { sha512 } from "@noble/hashes/sha512";
import { Keys } from "../hooks/useKeys";
import { EmscriptenModule } from "../types";
ed25519.etc.sha512Sync = (...m) => sha512(ed25519.etc.concatBytes(...m));

export class HydraMultiplayer {
  keys: Keys;
  // inbound is ANY(admin, player)
  inboundScript: string;
  inboundAddress: { address: string; hash: string };
  // outobund is ANY(player, admin)
  outboundScript: string;
  outboundAddress: { address: string; hash: string };
  hydra: Hydra;
  myIP: number = 0;
  latestUTxO: UTxO | null = null;
  packetQueue: Packet[] = [];
  module: EmscriptenModule;

  constructor(
    keys: Keys,
    adminPkh: string,
    url: string,
    module: EmscriptenModule,
  ) {
    this.module = module;
    this.keys = keys;

    this.inboundScript = `8202828200581c${adminPkh}8200581c${keys.publicKeyHashHex!}`;
    this.inboundAddress = getNativeScriptAddress(this.inboundScript, 0);
    this.outboundScript = `8202828200581c${keys.publicKeyHashHex!}8200581c${adminPkh}`;
    this.outboundAddress = getNativeScriptAddress(this.outboundScript, 0);

    this.hydra = new Hydra(url, 100);
    this.hydra.onTxSeen = this.onTxSeen.bind(this);

    this.SendPacket = this.SendPacket.bind(this);
    this.setIP = this.setIP.bind(this);
  }

  public setIP(ip: number) {
    this.myIP = ip;
  }

  public async selectUTxO(): Promise<void> {
    if (this.latestUTxO) {
      return;
    }
    await this.hydra.populateUTxO();
    const utxos = await this.hydra.getUtxos(this.outboundAddress.address);
    // TODO: robust
    this.latestUTxO = utxos.find((u) => !u.datumHash)!;
  }

  public async SendPacket(
    to: number,
    from: number,
    data: Uint8Array,
  ): Promise<void> {
    this.packetQueue.push({ to, from, data });
    await this.sendPacketQueue();
  }

  public async sendPacketQueue(): Promise<void> {
    if (this.packetQueue.length == 0 || !this.hydra.isConnected()) {
      return;
    }
    await this.selectUTxO();
    const datum = encodePackets(this.packetQueue);

    const [newUTxO, tx] = buildTx(this.latestUTxO!, this.keys, datum, {
      hash: this.outboundAddress.hash,
      script: this.outboundScript,
    });
    await this.hydra.submitTx(tx);
    this.latestUTxO = newUTxO;
    this.packetQueue = [];
  }

  public onTxSeen(_txId: TxHash, tx: TxComplete): void {
    // TODO: tolerate other txs here
    try {
      const output = tx.txComplete.body().outputs().get(0);
      const packetsRaw = output?.datum()?.as_data()?.get().to_bytes();
      if (!packetsRaw) {
        return;
      }
      const packets = decodePackets(packetsRaw);
      for (const packet of packets) {
        if (packet.to == this.myIP) {
          const buf = this.module._malloc!(packet.data.length);
          this.module.HEAPU8!.set(packet.data, buf);
          this.module._ReceivePacket!(packet.from, buf, packet.data.length);
          this.module._free!(buf);
        }
      }
    } catch (err) {
      console.warn(err);
    }
  }
}

interface Packet {
  to: number;
  from: number;
  data: Uint8Array;
}

function encodePackets(packets: Packet[]): string {
  return Data.to(
    packets.map(
      ({ to, from, data }) =>
        new Constr(0, [BigInt(to), BigInt(from), toHex(data)]),
    ),
  );
}

function decodePackets(raw: Uint8Array): Packet[] {
  const packets = Data.from(toHex(raw)) as Constr<Data>[];
  return packets.map((packet) => {
    const [to, from, data] = packet.fields;
    return {
      to: Number(to),
      from: Number(from),
      data: fromHex(data as string),
    };
  });
}

const buildTx = (
  inputUtxo: UTxO,
  keys: Keys,
  datum: string,
  nativeScript: { hash: string; script: string },
): [UTxO, string] => {
  // Hand-roll transaction creation for more performance
  const datumLength = datum.length / 2;
  let datumLengthHex = datumLength.toString(16);
  if (datumLengthHex.length % 2 !== 0) {
    datumLengthHex = "0" + datumLengthHex;
  }
  const lengthLengthTag = 57 + datumLengthHex.length / 2;
  const txBodyByHand =
    `a3` + // Prefix
    `0081825820${inputUtxo.txHash}0${inputUtxo.outputIndex}` + // One input
    `0181a300581d70${nativeScript.hash}018200a0028201d818${lengthLengthTag}${datumLengthHex}${datum}` + // Output to users PKH
    `0200`; // No fee

  const txId = toHex(blake2b(fromHex(txBodyByHand), { dkLen: 256 / 8 }));
  const signature = toHex(ed25519.sign(txId, keys.privateKeyBytes!));

  const witnessSetByHand = `a20081825820${keys.publicKeyHex!}5840${signature}01${nativeScript}`; // just signed by the user
  const txByHand = `84${txBodyByHand}${witnessSetByHand}f5f6`;

  const newUtxo: UTxO = {
    txHash: txId,
    outputIndex: 0,
    address: keys.address!,
    assets: { lovelace: 0n },
    datumHash: null,
    datum: datum,
    scriptRef: null,
  };

  return [newUtxo, txByHand];
};

const getNativeScriptAddress = (
  scriptHex: string,
  networkId: number,
): { address: string; hash: string } => {
  const script = C.NativeScript.from_bytes(fromHex(scriptHex));
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

  return { address: stringAddress, hash: stringScriptHash };
};
