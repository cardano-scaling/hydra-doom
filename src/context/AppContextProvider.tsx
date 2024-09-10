import { FC, PropsWithChildren, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppContext } from "./useAppContext";
import { GameStatistics } from "../types";
import { SERVER_URL } from "../constants";

const AppContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const globalQuery = useQuery<GameStatistics>({
    queryKey: ["global"],
    queryFn: async () => {
      const response = await fetch(`${SERVER_URL}/global`);
      return response.json();
    },
    // refetchInterval: 1000,
  });

  const value = useMemo(() => ({ globalQuery }), [globalQuery]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContextProvider;
