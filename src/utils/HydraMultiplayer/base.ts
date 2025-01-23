import { Data, Core } from "@blaze-cardano/sdk";
import * as ed25519 from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";

import { Hydra } from ".././hydra";
import { EmscriptenModule, TxHash, UTxO } from "../../types";
import { Keys } from "../../types";
import { fromHex, toHex } from "../helpers";
import { Packet as DatumPacket, Game, PacketArray, TGame } from "./types";
ed25519.etc.sha512Sync = (...m) => sha512(ed25519.etc.concatBytes(...m));

export abstract class HydraMultiplayer {
  public key: Keys;
  hydra: Hydra;
  myIP: number = 0;
  latestUTxO: UTxO | null = null;
  packetQueue: Packet[] = [];
  module: EmscriptenModule;
  networkId: number;
  state: "Finished" | "Running";

  gameId?: string;
  players?: string[];

  onNewGame?: (
    gameId: string,
    players: number,
    bots: number,
    ephemeralKey: string,
  ) => void;
  onPlayerJoin?: (gameId: string, ephemeralKeys: string[]) => void;
  onTxSeen?: (txId: TxHash, tx: any) => void; // refresh timeout timers
  onPacket?: (tx: any, packet: Packet) => void;

  constructor({
    key,
    url,
    filterAddress,
    module,
    networkId = 0,
    onConnect,
    onDisconnect,
  }: {
    key: Keys;
    url: string;
    module: EmscriptenModule;
    filterAddress?: string;
    networkId?: number;
    onConnect?: () => void;
    onDisconnect?: () => void;
  }) {
    this.key = key;
    this.module = module;
    this.networkId = networkId;
    this.state = "Running";

    this.hydra = new Hydra(url, filterAddress, onConnect, onDisconnect, 100);
    this.hydra.onTxSeen = this.observeTx.bind(this);

    this.SendPacket = this.SendPacket.bind(this);
    this.setIP = this.setIP.bind(this);
    this.setState = this.setState.bind(this);
  }

  public setState(state: number) {
    if (state === 0) {
      this.state = "Running";
    } else if (state === 1) this.state = "Finished";
  }

  public setIP(ip: number) {
    this.myIP = ip;
  }

  public async SendPacket(
    to: number,
    from: number,
    kills: number[],
    data: Uint8Array,
  ): Promise<void> {
    const ephemeralKey = this.key.publicKeyHashBytes;
    this.packetQueue.push({ to, from, ephemeralKey, kills, data });
    await this.sendPacketQueue();
  }

  public async sendPacketQueue(): Promise<void> {
    if (this.packetQueue.length == 0 || !this.hydra.isConnected()) {
      return;
    }
    await this.selectUTxO();
    const datum = encodePackets(this.packetQueue, this.state);

    const [newUTxO, tx] = this.buildTx(datum);
    await this.hydra.submitTx(tx);
    this.latestUTxO = newUTxO;
    this.packetQueue = [];
  }

  public observeTx(txId: TxHash, tx: any): void {
    try {
      const body = tx[0];
      const outputs = body["1"];
      const output = outputs[0];
      const datumRaw: Uint8Array | undefined = output?.["2"]?.[1]?.value;
      if (!datumRaw) {
        return;
      }
      const packets = decodePackets(datumRaw);
      if (!packets) {
        // We failed to decode packets, so this might be a new game or join game tx
        const game = decodeGame(datumRaw);
        if (game.players.length == 0) {
          this.gameId = txId;
          this.players = game.players;
          this.onNewGame?.(
            txId,
            Number(game.playerCount),
            Number(game.botCount),
            game.players[0],
          );
        } else {
          if (this.players?.toString() !== game.players.toString()) {
            this.players = game.players;
            this.onPlayerJoin?.(this.gameId!, game.players);
          }
        }
        return;
      }
      for (const packet of packets) {
        this.onPacket?.(tx, packet);
        if (packet.to == this.myIP) {
          const buf = this.module._malloc!(packet.data.length);
          this.module.HEAPU8!.set(packet.data, buf);
          this.module._ReceivePacket!(packet.from, buf, packet.data.length);
          this.module._free!(buf);
          this.onTxSeen?.(txId, tx);
        }
      }
    } catch (err) {
      console.warn(err);
    }
  }

  protected signData(data: string): string {
    return toHex(ed25519.sign(data, this.key.privateKeyBytes!));
  }
  public abstract selectUTxO(): Promise<void>;
  protected abstract buildTx(datum: string): [UTxO, string];
}

export interface Packet {
  to: number;
  from: number;
  ephemeralKey: Uint8Array;
  kills: number[];
  data: Uint8Array;
}

function encodePackets(
  packets: Packet[],
  state: "Finished" | "Running",
): string {
  const packetData = packets.map((data) =>
    Data.to(
      {
        to: BigInt(data.to),
        from: BigInt(data.from),
        ephemeralKey: toHex(data.ephemeralKey),
        kills: Array.from(data.kills).map((k) => BigInt(k)),
        state,
        data: toHex(data.data),
      },
      DatumPacket,
    ),
  );

  return Data.to(packetData, PacketArray).toCbor();
}

function decodePackets(raw: Uint8Array): Packet[] | undefined {
  try {
    const packets = Data.from(
      Core.PlutusData.fromCbor(Core.HexBlob(toHex(raw))),
      PacketArray,
    );
    return packets instanceof Array
      ? packets.map(({ to, from, ephemeralKey, kills, data }) => {
          return {
            to: Number(to),
            from: Number(from),
            ephemeralKey: fromHex(ephemeralKey as string),
            kills: kills.map((k) => Number(k)),
            data: fromHex(data as string),
          };
        })
      : undefined;
  } catch (err) {
    return undefined;
  }
}

interface Game {
  referee_key_hash: string;
  playerCount: bigint;
  botCount: bigint;
  players: string[];
  state: "Lobby" | "Running" | "Cheated" | "Finished" | "Aborted";
  winner?: string;
  cheater?: string;
}

function decodeGame(raw: Uint8Array): TGame {
  const game = Data.from(
    Core.PlutusData.fromCbor(Core.HexBlob(toHex(raw))),
    Game,
  );

  const {
    referee_payment,
    playerCountRaw,
    botCountRaw,
    player_payments,
    stateTag,
    winnerRaw,
    cheaterRaw,
  } = game;

  const referee_key_hash = referee_payment.payment_key_hash;
  const playerCount = playerCountRaw as bigint;
  const botCount = botCountRaw as bigint;
  return {
    referee_key_hash: referee_key_hash,
    playerCount,
    botCount,
    players: player_payments.map((p) => p.payment_key_hash),
    state: stateTag,
    winner: winnerRaw,
    cheater: cheaterRaw,
  };
}
