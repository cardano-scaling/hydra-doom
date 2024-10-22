import { Constr, Data, fromHex, toHex, TxComplete, TxHash, UTxO } from "lucid-cardano";
import { Hydra } from "./hydra";

import * as ed25519 from "@noble/ed25519";
import { blake2b } from "@noble/hashes/blake2b";
import { sha512 } from "@noble/hashes/sha512";
import { Keys } from "../hooks/useKeys";
ed25519.etc.sha512Sync = (...m) => sha512(ed25519.etc.concatBytes(...m));

export class HydraMultiplayer {
    keys: Keys;
    hydra: Hydra;
    myIP: number = 0;
    latestUTxO: UTxO | null = null;
    packetQueue: Packet[] = [];

    constructor(keys: Keys, url: string) {
        this.keys = keys;
        this.hydra = new Hydra(url, 100);
        this.hydra.onTxSeen = this.onTxSeen.bind(this);

        this.SendPacket = this.SendPacket.bind(this);
        this.setIP = this.setIP.bind(this);
    }

    public setIP(ip: number) {
        this.myIP = ip;
    }

    public async selectUTxO(): Promise<void> {
        if (!!this.latestUTxO) {
            return;
        }
        await this.hydra.populateUTxO();
        let utxos = await this.hydra.getUtxos(this.keys.address!);
        // TODO: robust
        if (this.myIP === 1) {
          this.latestUTxO = utxos.find(u => u.outputIndex === 1)!;
        } else {
          this.latestUTxO = utxos.find(u => u.outputIndex === 0)!;
        }
    }

    public async SendPacket(to: number, from: number, data: Uint8Array): Promise<void> {
        this.packetQueue.push({ to, from, data });
        await this.sendPacketQueue();
    }

    public async sendPacketQueue(): Promise<void> {
        if (this.packetQueue.length == 0) {
            return;
        }
        await this.selectUTxO();
        let datum = encodePackets(this.packetQueue);

        let [newUTxO, tx] = buildTx(this.latestUTxO!, this.keys, datum);
        await this.hydra.submitTx(tx);
        this.latestUTxO = newUTxO;
        this.packetQueue = [];
    }

    public onTxSeen(_txId: TxHash, tx: TxComplete): void {
        // TODO: tolerate other txs here
        const output = tx.txComplete.body().outputs().get(0);
        const packetsRaw = output?.datum()?.as_data()?.get().to_bytes();
        if (!packetsRaw) {
            return;
        }
        const packets = decodePackets(packetsRaw);
        for (const packet of packets) {
            if (packet.to == this.myIP) {
                let buf = window.Module._malloc!(packet.data.length);
                window.Module.HEAPU8!.set(packet.data, buf);
                window.Module._ReceivePacket!(packet.from, buf, packet.data.length);
                window.Module._free!(buf);
            }
        }
    }
}

interface Packet {
    to: number,
    from: number,
    data: Uint8Array,
}

function encodePackets(packets: Packet[]): string {
  return Data.to(
    packets.map(
        ({ to, from, data }) => new Constr(0, [BigInt(to), BigInt(from), toHex(data)])
    )
  );
}

function decodePackets(raw: Uint8Array): Packet[] {
  const packets = Data.from(toHex(raw)) as Constr<Data>[];
  return packets.map((packet) => {
    let [to, from, data] = packet.fields;
    return {
      to: Number(to),
      from: Number(from),
      data: fromHex(data as string),
    }
  });
}


const buildTx = (
  inputUtxo: UTxO,
  keys: Keys,
  datum: string,
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
    `0181a300581d60${keys.publicKeyHashHex!}018200a0028201d818${lengthLengthTag}${datumLengthHex}${datum}` + // Output to users PKH
    `0200`; // No fee

  const txId = toHex(
    blake2b(fromHex(txBodyByHand), { dkLen: 256 / 8 }),
  );
  const signature = toHex(ed25519.sign(txId, keys.privateKeyBytes!));

  const witnessSetByHand = `a10081825820${keys.publicKeyHex!}5840${signature}`; // just signed by the user
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