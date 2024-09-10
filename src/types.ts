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

export interface Region {
  name: string;
  value: string;
}
