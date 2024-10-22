import { createContext, Dispatch, useContext } from "react";
import { GameStatistics, Region } from "../types";
import { UseQueryResult } from "@tanstack/react-query";
import { REGIONS } from "../constants";

interface GameData {
  code: string;
  petName: string;
  type?: "new" | "join";
}

interface AppContextInterface {
  gameData: GameData;
  globalQuery?: UseQueryResult<GameStatistics, Error>;
  region: Region;
  setGameData: Dispatch<React.SetStateAction<GameData>>;
  setRegion: Dispatch<React.SetStateAction<Region>>;
}

export const AppContext = createContext<AppContextInterface>({
  gameData: { petName: "", code: "" },
  globalQuery: undefined,
  region: REGIONS[0],
  setGameData: () => {},
  setRegion: () => {},
});

export const useAppContext = () => {
  const context = useContext(AppContext);
  return context;
};
