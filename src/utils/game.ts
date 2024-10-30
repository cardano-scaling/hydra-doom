import { EGameType, GameData } from "../types";

export const getArgs = ({ type, code, petName }: GameData) => {
  const args = ["-window", "-nogui", "-nomusic", "-config", "default.cfg"];

  if (type !== EGameType.SOLO) {
    args.push("-iwad", "freedoom2.wad", "-file", "Cardano.wad", "-deathmatch");
    if (code) {
      args.push("-connect", "1");
    } else {
      args.push("-server");
    }
  }

  if (petName) args.push("-pet", petName);

  return args;
};
