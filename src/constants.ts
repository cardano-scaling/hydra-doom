export const CABINET_KEY = import.meta.env.VITE_CABINET_KEY;
export const GLOBAL_MAX_SPEED = 30 * 100;
export const HANDLE_CACHE_KEY = "player-handle-cache";
export const HYDRA_DOOM_SESSION_KEY = "hydra-doom-session-key";
export const MAX_SPEED = 40;
export const REGION = import.meta.env.VITE_REGION;
export const REGIONS = [
  { name: "Ohio, NA", value: "us-east-2" },
  { name: "Oregon, NA", value: "us-west-2" },
  { name: "Frankfurt, Europe", value: "eu-central-1" },
  { name: "Cape Town, Africa", value: "af-south-1" },
  { name: "Melbourne, Australia", value: "ap-southeast-4" },
  { name: "Seoul, Asia", value: "ap-northeast-2" },
  { name: "Sao Paulo, SA", value: "sa-east-1" },
];
export const SERVER_URL = import.meta.env.VITE_SERVER_URL;
export const TIC_RATE_MAGIC = 35; // 35 is the ticrate in DOOM WASM they use to calculate time.
