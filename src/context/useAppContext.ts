import { createContext, useContext } from "react";
import { GameStatistics } from "../types";
import { UseQueryResult } from "@tanstack/react-query";

interface AppContextInterface {
  globalQuery?: UseQueryResult<GameStatistics, Error>;
}

export const AppContext = createContext<AppContextInterface>({
  globalQuery: undefined,
});

export const useAppContext = () => {
  const context = useContext(AppContext);
  return context;
};
