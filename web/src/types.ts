import { Assets, Unit } from "lucid-cardano";

// Hydra API types
export type UTxOResponse = {
  [txIn: string]: {
    address: string;
    datum: string | null;
    inlineDatum: any;
    inlineDatumhash: string | null;
    refereceScript: any | null;
    value: Record<string, number>;
  };
};

// Conversions
export const recordValueToAssets = (value: Record<string, number>): Assets =>
  Object.entries(value).reduce(
    (acc, pair) => {
      const [key, value] = pair;
      acc[key] = BigInt(value);
      return acc;
    },
    {} as Record<Unit, bigint>
  );

export type LeaderboardEntry = [string, number];

export interface PlayerStats {
  [key: string]: number;
}

export interface PlayerPlayTime {
  [key: string]: number[];
}

export interface GameStatistics {
  total_games: number;
  active_games: number;
  transactions: number;
  bytes: number;
  kills: PlayerStats;
  total_kills: number;
  kills_leaderboard: LeaderboardEntry[];
  items: PlayerStats;
  total_items: number;
  items_leaderboard: LeaderboardEntry[];
  secrets: PlayerStats;
  total_secrets: number;
  secrets_leaderboard: LeaderboardEntry[];
  player_play_time: PlayerPlayTime;
  total_play_time: number;
}
