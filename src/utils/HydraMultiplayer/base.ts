import {
  Constr,
  Data,
  fromHex,
  toHex,
  TxComplete,
  TxHash,
  UTxO,
} from "lucid-cardano";
import { Hydra } from ".././hydra";

import * as ed25519 from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";
import { EmscriptenModule } from "../../types";
ed25519.etc.sha512Sync = (...m) => sha512(ed25519.etc.concatBytes(...m));

export abstract class HydraMultiplayer {
  key: {
    publicKeyHash: string;
    publicKey: string;
    privateKeyBytes: Uint8Array;
  };
  hydra: Hydra;
  myIP: number = 0;
  latestUTxO: UTxO | null = null;
  packetQueue: Packet[] = [];
  module: EmscriptenModule;

  constructor({
    key,
    url,
    filterAddress,
    module,
  }: {
    key: {
      publicKey: string;
      publicKeyHash: string;
      privateKeyBytes: Uint8Array;
    };
    url: string;
    module: EmscriptenModule;
    filterAddress?: string;
  }) {
    this.key = key;
    this.module = module;

    this.hydra = new Hydra(url, filterAddress, 100);
    this.hydra.onTxSeen = this.onTxSeen.bind(this);

    this.SendPacket = this.SendPacket.bind(this);
    this.setIP = this.setIP.bind(this);
  }

  public setIP(ip: number) {
    this.myIP = ip;
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

    const [newUTxO, tx] = this.buildTx(datum);
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

  protected signData(data: string): string {
    return toHex(ed25519.sign(data, this.key.privateKeyBytes));
  }
  public abstract selectUTxO(): Promise<void>;
  protected abstract buildTx(datum: string): [UTxO, string];
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
