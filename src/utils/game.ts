import { REGIONS } from "../constants";
import { EGameType, GameData } from "../types";

export const getArgs = ({ type, petName }: GameData) => {
  const args = ["-window", "-nogui", "-nomusic", "-config", "default.cfg"];

  args.push(
    "-iwad",
    "freedoom2.wad",
    "-merge",
    "dm_iog.wad",
    "iog_assets.wad",
    "-warp",
    "1",
    "-dehlump",
    "-extratics",
    "1",
    "-devparm",
  );
  if (type === EGameType.SOLO) {
    // Do nothing
    console.log("SOLO");
  } else {
    args.push("-altdeath", "-connect", "1");
  }

  if (petName) args.push("-pet", petName);

  return args;
};

export const getRegionWithPrefix = (prefix: string) => {
  return REGIONS.find((r) => prefix === r.prefix);
};
