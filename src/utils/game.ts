import { GameData } from "../types";

export const getArgs = ({ type, code, petName }: GameData) => {
  const args = [
    "-window",
    "-nogui",
    "-nomusic",
    "-config",
    "default.cfg",
  ];

  if (type !== "solo") {
    if (code) {
      args.push("-connect", "1");
      args.push(
        "-iwad",
        "freedoom2.wad",
        "-file",
        "Cardano.wad",
        "-deathmatch",
      );
    } else {
      args.push("-server",  "-dedicated");
    }
  }

  if (petName) args.push("-pet", petName);

  return args;
};
