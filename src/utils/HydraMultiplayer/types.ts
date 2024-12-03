import { Data, Static } from "@blaze-cardano/sdk";

export const PacketSchema = Data.Object({
  to: Data.Integer(),
  from: Data.Integer(),
  ephemeralKey: Data.Bytes(),
  data: Data.Bytes(),
});

export type TPacket = Static<typeof PacketSchema>;
export const Packet = PacketSchema as unknown as TPacket;

export const PacketArraySchema = Data.Array(Packet);

export type TPacketArray = Static<typeof PacketArraySchema>;
export const PacketArray = PacketArraySchema as unknown as TPacketArray;

export const GameSchema = Data.Object({
  referee_payment: Data.Object({
    payment_key_hash: Data.Bytes()
  }),
  playerCountRaw: Data.Integer(),
  botCountRaw: Data.Integer(),
  player_payments: Data.Array(Data.Object({ payment_key_hash: Data.Bytes() })),
  stateTag: Data.Enum([
    Data.Literal("Lobby"),
    Data.Literal("Running"),
    Data.Literal("Cheated"),
    Data.Literal("Finished"),
    Data.Literal("Aborted"),
  ]),
  winnerRaw: Data.Nullable(Data.Object({ payment_key_hash: Data.Bytes() })),
  cheaterRaw: Data.Nullable(Data.Object({ payment_key_hash: Data.Bytes() })),
});

export type TGame = Static<typeof GameSchema>;
export const Game = GameSchema as unknown as TGame;
