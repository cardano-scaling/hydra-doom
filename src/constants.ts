// Settings needed for running in a local configuration
export const IS_LOCAL = !!import.meta.env.VITE_IS_LOCAL;
export const LOCAL_HOST = import.meta.env.VITE_LOCAL_HOST || "localhost";
export const LOCAL_GAME_PORT = import.meta.env.VITE_LOCAL_GAME_PORT || 8000;
export const LOCAL_HEALTH_PORT = import.meta.env.VITE_LOCAL_HEALTH_PORT || 3000;

export const CABINET_KEY = import.meta.env.VITE_CABINET_KEY;
export const NETWORK_ID = Number(import.meta.env.VITE_NETWORK_ID || 1);
export const HANDLE_CACHE_KEY = "player-handle-cache";
export const MAX_SPEED = 40;
export const REGIONS = [
  { name: "Virginia, NA", value: "us-east-1", prefix: "a" },
  { name: "Frankfurt, Europe", value: "eu-central-1", prefix: "b" },
  { name: "Oregon, NA", value: "us-west-2", prefix: "c" },
  { name: "Singapore", value: "ap-southeast-1", prefix: "d" },
  { name: "São Paulo, SA", value: "sa-east-1", prefix: "e" },
  { name: "Cape Town, Africa", value: "af-south-1", prefix: "f" },
];
export const TIC_RATE_MAGIC = 35; // 35 is the ticrate in DOOM WASM they use to calculate time.
// Mainnet api key, change to env variables when we have access.
export const API_BASE_URL = "https://rewardengine.dripdropz.io/api/v1";
// Mainnet api key, change to env variables when we have access.
export const API_KEY = "d93212b3-dbdc-40d0-befd-f90508c6232d";
export const SESSION_ID_KEY = "session-id";
export const MAX_PLAYERS = 4;
