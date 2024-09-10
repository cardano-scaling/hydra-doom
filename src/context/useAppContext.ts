import { createContext, Dispatch, useContext } from "react";
import { GameStatistics, Region } from "../types";
import { UseQueryResult } from "@tanstack/react-query";
import { REGIONS } from "../constants";

interface AppContextInterface {
  globalQuery?: UseQueryResult<GameStatistics, Error>;
  region: Region;
  setRegion: Dispatch<React.SetStateAction<Region>>;
}

export const AppContext = createContext<AppContextInterface>({
  globalQuery: undefined,
  region: REGIONS[0],
  setRegion: () => {},
});

export const useAppContext = () => {
  const context = useContext(AppContext);
  return context;
};
