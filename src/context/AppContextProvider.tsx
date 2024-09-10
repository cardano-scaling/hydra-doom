import { FC, PropsWithChildren, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppContext } from "./useAppContext";
import { GameStatistics, Region } from "../types";
import { REGIONS, SERVER_URL } from "../constants";

const AppContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const [region, setRegion] = useState<Region>(REGIONS[0]);
  const globalQuery = useQuery<GameStatistics>({
    queryKey: ["global"],
    queryFn: async () => {
      const response = await fetch(`${SERVER_URL}global`);
      return response.json();
    },
    refetchInterval: 1000,
  });

  const value = useMemo(
    () => ({ globalQuery, region, setRegion }),
    [globalQuery, region],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContextProvider;
