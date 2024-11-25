import { FC, PropsWithChildren, useEffect, useMemo, useState } from "react";
import { AppContext } from "./useAppContext";
import {
  Account,
  AuthResponse,
  EGameType,
  GameStatistics,
  Region,
} from "../types";
import useBestRegion from "../hooks/useBestRegion";
import useKeys from "../hooks/useKeys";
import { MAX_PLAYERS, REGIONS } from "../constants";
import { useQuery } from "@tanstack/react-query";
import { useSessionReferenceKeyCache } from "../utils/localStorage";
import { checkSignin, fetchGlobalStats } from "../utils/requests";

const AppContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const [sessionReference, setSessionReference] = useSessionReferenceKeyCache();
  const keys = useKeys();
  const { bestRegion } = useBestRegion(REGIONS);
  const [gameData, setGameData] = useState({
    code: "",
    petName: "",
    type: EGameType.SOLO,
  });
  const [accountData, setAccountData] = useState<Account>();
  const [region, setRegion] = useState<Region | null>(null);
  const [players, setPlayers] = useState(1);
  const bots = MAX_PLAYERS - players;

  const { data: userData, isLoading: isLoadingUserData } =
    useQuery<AuthResponse>({
      queryKey: ["signinCheck", sessionReference],
      queryFn: () => checkSignin(sessionReference),
      enabled: !accountData && !!sessionReference,
    });

  const { data: globalStats, isLoading: isLoadingGlobalStats } =
    useQuery<GameStatistics>({
      queryKey: ["globalStats", bestRegion],
      queryFn: () => fetchGlobalStats(bestRegion?.value ?? ""),
      enabled: !!bestRegion,
      refetchInterval: 6000, // 6 seconds
    });

  useEffect(() => {
    if (userData) {
      const { account, authenticated } = userData;
      if (authenticated) {
        setAccountData(account);
      } else {
        setSessionReference("");
      }
    }
  }, [setSessionReference, userData]);

  useEffect(() => {
    if (bestRegion) setRegion(bestRegion);
  }, [bestRegion]);

  const value = useMemo(
    () => ({
      accountData,
      bestRegion,
      bots,
      gameData,
      globalStats,
      isLoadingGlobalStats,
      isLoadingUserData,
      keys,
      players,
      region,
      setAccountData,
      setGameData,
      setPlayers,
      setRegion,
    }),
    [
      accountData,
      bestRegion,
      bots,
      gameData,
      globalStats,
      isLoadingGlobalStats,
      isLoadingUserData,
      keys,
      players,
      region,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContextProvider;
