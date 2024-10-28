import { FC, PropsWithChildren, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppContext } from "./useAppContext";
import { GameStatistics, Region } from "../types";
import { REGIONS } from "../constants";

const AppContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const [gameData, setGameData] = useState({
    petName: "",
    code: "",
  });

  const [region, setRegion] = useState<Region>(REGIONS[0]);
  const globalQuery = useQuery<GameStatistics>({
    queryKey: ["global"],
    queryFn: async () => {
      return Promise.resolve(undefined as unknown as GameStatistics);
    },
    refetchInterval: 1000,
  });

  const value = useMemo(
    () => ({
      globalQuery,
      // newGameQuery,
      // joinGameQuery,
      region,
      setRegion,
      gameData,
      setGameData,
    }),
    [gameData, globalQuery, region],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContextProvider;
