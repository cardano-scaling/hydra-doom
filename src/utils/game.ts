import { EGameType, GameData } from "../types";

export const getArgs = ({ type, code, petName }: GameData) => {
  const args = ["-window", "-nogui", "-nomusic", "-config", "default.cfg"];

  args.push("-iwad", "freedoom2.wad", "-file", "Cardano.wad");
  if (type === EGameType.SOLO) {
    // Do nothing
    console.log("SOLO");
  } else {
    args.push("-deathmatch");
    if (code) {
      args.push("-connect", "1");
    } else {
      args.push("-server");
    }
  }

  if (petName) args.push("-pet", petName);

  return args;
};
