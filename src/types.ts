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
    HydraMultiplayer: HydraMultiplayer;
  }
}

// {
//   "authenticated": true,
//   "account": {
//     "auth_provider": "google",
//     "auth_provider_id": "114493962815994125644",
//     "auth_name": "Selvio Perez",
//     "auth_email": "selvio.perez@sundaeswap.finance",
//     "auth_avatar": "https://lh3.googleusercontent.com/a/ACg8ocLqN4aFyOu89WYGcG48YS02DW2RMMRLSUPao0NX6qV-nBmj-w=s96-c"
//   },
//   "session": {
//     "reference": "ed25519_sk1n80sl3p24vcgaj6eynqpn4m36xpxn8mp78999hkpv4awf2hn6xusd8eu25",
//     "session_id": "201dfe3d-01da-4b3a-a9c9-e19e0946441d",
//     "auth_country_code": "CO",
//     "authenticated_at": "2024-11-18 23:00:02"
//   }
// }

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
  account: Account;
  session: Session;
}
