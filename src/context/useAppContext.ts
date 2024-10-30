import { createContext, Dispatch, useContext } from "react";
import { EGameType, GameData, Region } from "../types";
import { REGIONS } from "../constants";

interface AppContextInterface {
  gameData: GameData;
  region: Region;
  setGameData: Dispatch<React.SetStateAction<GameData>>;
  setRegion: Dispatch<React.SetStateAction<Region>>;
}

export const AppContext = createContext<AppContextInterface>({
  gameData: { petName: "", code: "", type: EGameType.SOLO },
  region: REGIONS[0],
  setGameData: () => {},
  setRegion: () => {},
});

export const useAppContext = () => {
  const context = useContext(AppContext);
  return context;
};
