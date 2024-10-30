import { HydraMultiplayer } from "./utils/hydra-multiplayer";

export type LeaderboardEntry = [string, number];

export interface PlayerStats {
  [key: string]: number;
}

export interface PlayerPlayTime {
  [key: string]: number[];
}

export interface GameStatistics {
  active_games: number;
  bytes: number;
  items_leaderboard: LeaderboardEntry[];
  items: PlayerStats;
  kills_leaderboard: LeaderboardEntry[];
  kills: PlayerStats;
  player_play_time: PlayerPlayTime;
  secrets_leaderboard: LeaderboardEntry[];
  secrets: PlayerStats;
  total_games: number;
  total_items: number;
  total_kills: number;
  total_play_time: number;
  total_secrets: number;
  transactions: number;
}

export interface NewGameResponse {
  ip: string;
  player_state: string;
}

export interface Region {
  name: string;
  value: string;
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
    callMain: (args: string[]) => void;
    Module: EmscriptenModule;
    HydraMultiplayer: HydraMultiplayer;
  }
}
