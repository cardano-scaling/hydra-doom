import { REGIONS } from "../constants";
import { EGameType, GameData } from "../types";

export const getArgs = ({ type, petName }: GameData, host: boolean) => {
  const args = ["-window", "-nogui", "-nomusic", "-config", "default.cfg"];

  args.push(
    "-iwad",
    "freedoom2.wad",
    "-merge",
    "dm_iog.wad",
    "iog_assets.wad",
    "-warp",
    "30",
    "-dehlump",
    "-extratics",
    "1",
    "-devparm",
    "-timer",
    "10",
  );
  if (type === EGameType.SOLO) {
    // Do nothing
    console.log("SOLO");
  } else {
    args.push("-altdeath");
    if (host) {
      args.push("-server");
    } else {
      args.push("-connect", "-1");
    }
  }

  if (petName) args.push("-pet", petName);

  return args;
};

export const getRegionWithPrefix = (prefix: string) => {
  return REGIONS.find((r) => prefix === r.prefix);
};
