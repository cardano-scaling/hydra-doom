export const IS_LOCAL = !!import.meta.env.VITE_IS_LOCAL;
export const CABINET_KEY = import.meta.env.VITE_CABINET_KEY;
export const GLOBAL_MAX_SPEED = 30 * 100;
export const HANDLE_CACHE_KEY = "player-handle-cache";
export const MAX_SPEED = 40;
export const REGIONS = [
  { name: "Virginia, NA", value: "us-east-1" },
  { name: "Frankfurt, Europe", value: "eu-central-1" },
  { name: "Oregon, NA", value: "us-west-2" },
];
export const TIC_RATE_MAGIC = 35; // 35 is the ticrate in DOOM WASM they use to calculate time.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
export const API_KEY = import.meta.env.VITE_API_KEY;
export const SESSION_REFERENCE_KEY = "session-reference";
export const MAX_PLAYERS = 4;
