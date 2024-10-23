import { GameData } from "../types";

export const getArgs = ({ type, code, petName }: GameData) => {
  const args = [
    "-iwad",
    "freedoom2.wad",
    "-file",
    "Cardano.wad",
    "-window",
    "-nogui",
    "-nomusic",
    "-config",
    "default.cfg",
  ];

  if (type !== "solo") {
    if (code) {
      args.push("-connect", "1");
    } else {
      args.push("-server", "-deathmatch");
    }
  }

  if (petName) args.push("-pet", petName);

  return args;
};
