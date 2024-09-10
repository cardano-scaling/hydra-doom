import { createContext, useContext } from "react";
import { GameStatistics } from "../types";
import { UseQueryResult } from "@tanstack/react-query";

interface GameContextInterface {
  newGameQuery?: UseQueryResult<GameStatistics, Error>;
}

export const GameContext = createContext<GameContextInterface>({
  newGameQuery: undefined,
});

export const useGameContext = () => {
  const context = useContext(GameContext);
  return context;
};
