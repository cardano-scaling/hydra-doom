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
import { REGIONS } from "../constants";
import { useQuery } from "@tanstack/react-query";
import { useSessionIdKeyCache } from "../utils/localStorage";
import { authRefresh, fetchGlobalStats } from "../utils/requests";
import { getRegionWithPrefix } from "../utils/game";

const AppContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const pathSegments = window.location.hash.split("/").filter(Boolean);
  const code = pathSegments[2];
  const [sessionId, setSessionId] = useSessionIdKeyCache();
  const keys = useKeys();
  const { publicKeyHashHex } = keys || {};
  const { bestRegion } = useBestRegion(REGIONS);
  const [gameData, setGameData] = useState({
    code: "",
    petName: "",
    type: EGameType.SOLO,
  });
  const [accountData, setAccountData] = useState<Account>();
  const [region, setRegion] = useState<Region | null>(null);
  const [players, setPlayers] = useState(1);
  const [bots, setBots] = useState(1);

  const {
    data: userData,
    isError,
    isLoading: isLoadingUserData,
  } = useQuery<AuthResponse>({
    queryKey: ["authRefresh", publicKeyHashHex, sessionId],
    queryFn: () =>
      authRefresh({ newReference: publicKeyHashHex ?? "", sessionId }),
    enabled: !accountData && !!sessionId && !!publicKeyHashHex,
    retry: false,
  });

  const { data: globalStats, isLoading: isLoadingGlobalStats } =
    useQuery<GameStatistics>({
      queryKey: ["globalStats", bestRegion],
      queryFn: () => fetchGlobalStats(bestRegion?.value ?? ""),
      enabled: !!bestRegion,
      refetchInterval: 6000, // 6 seconds
    });

  useEffect(() => {
    if (isError) setSessionId("");
  }, [isError, setSessionId]);

  useEffect(() => {
    if (userData) {
      const { account, session } = userData;
      if (session?.session_id) setSessionId(session.session_id);
      if (account) setAccountData(account);
    }
  }, [setSessionId, userData]);

  useEffect(() => {
    const newRegion = getRegionWithPrefix(gameData.code[0]);
    if (newRegion) setRegion(newRegion);
  }, [gameData.code]);

  useEffect(() => {
    if (bestRegion && !code) setRegion(bestRegion);
  }, [bestRegion, code]);

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
      setBots,
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
