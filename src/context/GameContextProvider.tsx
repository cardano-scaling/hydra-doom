import { FC, PropsWithChildren, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { GameContext } from "./useGameContext";
import { GameStatistics } from "../types";
import { CABINET_KEY, REGION, SERVER_URL } from "../constants";
import useAddress from "../hooks/useAddress";
import { useAppContext } from "./useAppContext";

const GameContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const { region } = useAppContext();
  const address = useAddress();
  const newGameQuery = useQuery<GameStatistics>({
    queryKey: ["newGame", address, region.value],
    queryFn: async () => {
      const response = await fetch(
        `${SERVER_URL}new_game?address=${address}&region=${REGION ?? region.value}&reserved=${!!CABINET_KEY}`,
      );
      return response.json();
    },
    // enabled: !!address,
    enabled: false,
  });

  const value = useMemo(() => ({ newGameQuery }), [newGameQuery]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export default GameContextProvider;
