import { FC, PropsWithChildren, useEffect, useMemo, useState } from "react";
import { AppContext } from "./useAppContext";
import { Account, AuthResponse, EGameType } from "../types";
import useBestRegion from "../hooks/useBestRegion";
import useKeys from "../hooks/useKeys";
import { MAX_PLAYERS, REGIONS } from "../constants";
import { useQuery } from "@tanstack/react-query";
import { useSessionReferenceKeyCache } from "../utils/localStorage";
import { checkSignin } from "../utils/requests";

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
  const [players, setPlayers] = useState(1);
  const bots = MAX_PLAYERS - players;

  const { data: userData, isLoading: isLoadingUserData } =
    useQuery<AuthResponse>({
      queryKey: ["signinCheck", sessionReference],
      queryFn: () => checkSignin(sessionReference),
      enabled: !accountData && !!sessionReference,
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

  const value = useMemo(
    () => ({
      accountData,
      bots,
      gameData,
      isLoadingUserData,
      keys,
      players,
      region: bestRegion,
      setAccountData,
      setGameData,
      setPlayers,
    }),
    [accountData, bots, gameData, isLoadingUserData, keys, players, bestRegion],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContextProvider;
