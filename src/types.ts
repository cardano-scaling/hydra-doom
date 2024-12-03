import { HydraMultiplayerClient } from "./utils/HydraMultiplayer/client";

export type LeaderboardEntry = [string, number];

export interface PlayerStats {
  [key: string]: number;
}

export interface GameStatistics {
  active_bots: number;
  active_games: number;
  active_players: number;
  as_of: { secs_since_epoch: number; nanos_since_epoch: number };
  bytes_per_second: number;
  kills_per_minute: number;
  peak_txs_per_second: number;
  suicides_per_minute: number;
  total_bots: number;
  total_bytes: number;
  total_games: number;
  total_kills: number;
  total_players: number;
  total_suicides: number;
  total_txs: number;
  txs_per_second: number;
}

export interface NewGameResponse {
  game_id: string;
  ip: string;
  player_state: string;
  admin_pkh: string;
}

interface FileSystem {
  createPreloadedFile(
    parent: string,
    name: string,
    url: string,
    canRead: boolean,
    canWrite: boolean,
  ): void;
}

export interface HEAPU8 extends Uint8Array {
  [key: number]: number;
}

export interface EmscriptenModule {
  canvas?: HTMLCanvasElement;
  FS?: FileSystem;
  noInitialRun?: boolean;
  HEAPU8?: HEAPU8;
  locateFile?: (path: string, scripts: string) => string;
  onRuntimeInitialized?: () => void;
  postRun?: () => void;
  preRun?: (module: EmscriptenModule) => void;
  print?: (text: string) => void;
  printErr?: (text: string) => void;
  setStatus?: (text: string) => void;
  _malloc?: (size: number) => number;
  _free?: (ptr: number) => void;
  _ReceivePacket?: (from: number, buf: number, len: number) => void;
}

export enum EGameType {
  SOLO = "solo",
  HOST = "host",
  JOIN = "join",
}

export interface GameData {
  code: string;
  petName: string;
  type: EGameType;
}

declare global {
  interface Window {
    Module: EmscriptenModule;
    HydraMultiplayer: HydraMultiplayerClient;
  }
}

export interface Account {
  auth_provider: string;
  auth_provider_id: string;
  auth_name: string;
  auth_email: string;
  auth_avatar: string;
}

export interface Session {
  reference: string;
  session_id: string;
  auth_country_code: string;
  authenticated_at: string;
}
export interface AuthResponse {
  authenticated: boolean;
  account: Account | null;
  session: Session | null;
}

export interface Keys {
  privateKeyBytes: Uint8Array;
  privateKeyHex: string;
  publicKeyBytes: Uint8Array;
  publicKeyHex: string;
  publicKeyHashBytes: Uint8Array;
  publicKeyHashHex: string;
  address: string;
}

export interface Region {
  name: string;
  value: string;
}

export interface SessionStatsInterface {
  overview: {
    kill: number;
    death: number;
    suicide: number;
    new_game: number;
    game_started: number;
    game_finished: number;
    player_joined: number;
  };
  qualifier: {
    kill: number;
    death: number;
    suicide: number;
    new_game: number;
    game_started: number;
    game_finished: number;
    player_joined: number;
  };
}

/**
 * Lucid types
 */
export type Credential = {
  type: "Key" | "Script";
  hash: string;
};
export type ScriptType = "Native" | PlutusVersion;
export type PlutusVersion = "PlutusV1" | "PlutusV2";
export type PolicyId = string;
export type Script = {
  type: ScriptType;
  script: string;
};

export type UTxO = {
  txHash: TxHash;
  outputIndex: number;
  assets: Record<string, bigint>;
  address: Address;
  datumHash?: DatumHash | null;
  datum?: string | null;
  scriptRef?: Script | null;
};

export interface Delegation {
  poolId: string | null;
  rewards: bigint;
}

export interface OutRef {
  txHash: string;
  outputIndex: number;
}

export type Address = string;
export type DatumHash = string;
export type Transaction = string;
export type TxHash = string;
export type Unit = string;
export type CostModel = Record<string, number>;
export type CostModels = Record<PlutusVersion, CostModel>;
export type ProtocolParameters = {
  minFeeA: number;
  minFeeB: number;
  maxTxSize: number;
  maxValSize: number;
  keyDeposit: bigint;
  poolDeposit: bigint;
  priceMem: number;
  priceStep: number;
  maxTxExMem: bigint;
  maxTxExSteps: bigint;
  coinsPerUtxoByte: bigint;
  collateralPercentage: number;
  maxCollateralInputs: number;
  costModels: CostModels;
  minfeeRefscriptCostPerByte: number;
};
