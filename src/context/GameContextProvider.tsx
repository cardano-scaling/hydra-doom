import { FC, PropsWithChildren, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { GameContext } from "./useGameContext";
import { GameStatistics } from "../types";
import { SERVER_URL } from "../constants";
import useKeys from "../hooks/useKeys";

const GameContextProvider: FC<PropsWithChildren> = ({ children }) => {
  // const { region } = useAppContext();
  const { address } = useKeys();
  const newGameQuery = useQuery<GameStatistics>({
    queryKey: ["newGame", address],
    queryFn: async () => {
      const response = await fetch(`${SERVER_URL}new_game?address=${address}`);
      return response.json();
    },
    // enabled: !!address,
    enabled: false,
  });

  const value = useMemo(() => ({ newGameQuery }), [newGameQuery]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export default GameContextProvider;
