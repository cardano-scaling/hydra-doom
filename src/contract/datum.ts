import { Constr, Data } from "lucid-cardano";

export interface GameData {
  isOver: boolean;
  owner: string;
  admin: string;
  player: Player;
  monsters: MabObject[];
  leveltime: number[];
}
export interface Player {
  playerState: PlayerState;
  mapObject: MabObject;
  totalStats: PlayerStats;
  levelStats: PlayerStats;
}

export interface PlayerStats {
  killCount: number;
  secretCount: number;
  itemCount: number;
}

export interface MabObject {
  position: Position;
  health: number;
}

export interface Position {
  momentumX: number;
  momentumY: number;
  momentumZ: number;
  angle: number;
  z: number;
  floorZ: number;
}

export enum PlayerState {
  LIVE,
  DEAD,
  REBORN,
}

export const initialGameData = (ownerKey: string, adminKey: string) => ({
  isOver: false,
  owner: ownerKey,
  admin: adminKey,
  player: {
    playerState: PlayerState.LIVE,
    mapObject: {
      position: {
        momentumX: 0,
        momentumY: 0,
        momentumZ: 0,
        angle: 0,
        z: 0,
        floorZ: 0,
      },
      health: 100,
    },
    totalStats: {
      killCount: 0,
      secretCount: 0,
      itemCount: 0,
    },
    levelStats: {
      killCount: 0,
      secretCount: 0,
      itemCount: 0,
    },
  },
  monsters: [],
  leveltime: [],
});

export const buildDatum = (state: GameData): string => {
  return Data.to(
    new Constr(0, [
      encodeBoolean(state.isOver),
      encodeByteString(state.owner),
      encodeByteString(state.admin),
      encodePlayer(state.player),
      state.monsters.map((monster) => encodeMapObject(monster)),
      state.leveltime.map((time) => BigInt(time)),
    ]),
  );
};

export const decodeDatum = (datum: any): GameData | undefined => {
  try {
    return {
      isOver: datum.fields[0].constructor == 0, // TODO
      owner: datum.fields[1].fields[0].bytes,
      admin: datum.fields[2].fields[0].bytes,
      // TODO: rest of fields
    } as any as GameData;
  } catch (e) {
    return undefined;
  }
};

const encodePlayer = (player: Player) => {
  return new Constr(0, [
    encodePlayerState(player.playerState),
    encodeMapObject(player.mapObject),
    encodePlayerStats(player.totalStats),
    encodePlayerStats(player.levelStats),
  ]);
};

const encodePlayerStats = (stats?: PlayerStats) => {
  if (!stats) {
    return new Constr(0, [BigInt(0), BigInt(0), BigInt(0)]);
  }
  return new Constr(0, [
    BigInt(stats.killCount),
    BigInt(stats.secretCount),
    BigInt(stats.itemCount),
  ]);
};

const encodeMapObject = (mapObject: MabObject) => {
  return new Constr(0, [
    encodePosition(mapObject.position),
    BigInt(mapObject.health),
  ]);
};

const encodePosition = (position: Position) => {
  return new Constr(0, [
    BigInt(position.momentumX),
    BigInt(position.momentumY),
    BigInt(position.momentumZ),
    BigInt(position.angle),
    BigInt(position.z),
    BigInt(position.floorZ),
  ]);
};

const encodePlayerState = (state: PlayerState): Data => {
  switch (state) {
    case PlayerState.LIVE:
      return new Constr(0, []);
    case PlayerState.DEAD:
      return new Constr(1, []);
    case PlayerState.REBORN:
      return new Constr(2, []);
  }
};

const encodeBoolean = (b: boolean) => {
  return b ? new Constr(1, []) : new Constr(0, []);
};

const encodeByteString = (s: string) => {
  return new Constr(0, [s]);
};

export const hydraDatumToPlutus = (d: any) => {
  if ("fields" in d) {
    return new Constr(d.constructor, d.fields.map(hydraDatumToPlutus));
  } else if ("bytes" in d) {
    return d.bytes;
  } else if ("int" in d) {
    return BigInt(d.int);
  } else if ("list" in d) {
    return d.list.map(hydraDatumToPlutus);
  }
};
