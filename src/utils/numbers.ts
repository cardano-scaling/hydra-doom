import { TIC_RATE_MAGIC } from "../constants";

export const formatNumber = (num: number) => {
  return new Intl.NumberFormat("en").format(num);
};

export const formatPlayTime = (time: number) => {
  let playTimeSeconds = time / TIC_RATE_MAGIC;
  const days = Math.floor(playTimeSeconds / (24 * 3600));
  playTimeSeconds %= 24 * 3600;
  const hours = Math.floor(playTimeSeconds / 3600);
  playTimeSeconds %= 3600;
  const minutes = Math.floor(playTimeSeconds / 60);
  playTimeSeconds %= 60;

  return `${String(days).padStart(2, "0")}:${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(Math.trunc(playTimeSeconds)).padStart(2, "0")}`;
};