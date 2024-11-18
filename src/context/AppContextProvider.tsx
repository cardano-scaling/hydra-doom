import { FC, PropsWithChildren, useEffect, useMemo, useState } from "react";
import { AppContext } from "./useAppContext";
import { Account, AuthResponse, EGameType } from "../types";
import useBestRegion from "../hooks/useBestRegion";
import { API_BASE_URL, API_KEY, REGIONS } from "../constants";
import { useQuery } from "@tanstack/react-query";
import useKeys from "../hooks/useKeys";

const checkSignin = async (sessionKeyBech32: string): Promise<AuthResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/auth/check/${API_KEY}/?reference=${sessionKeyBech32}`,
  );
  if (!response.ok) {
    throw new Error("Failed to check sign-in status");
  }
  return response.json();
};

const AppContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const { sessionKeyBech32 } = useKeys();
  const { bestRegion } = useBestRegion(REGIONS);
  const [gameData, setGameData] = useState({
    code: "",
    petName: "",
    type: EGameType.SOLO,
  });
  const [accountData, setAccountData] = useState<Account>();

  console.log("accountData", accountData);

  const { data: userData } = useQuery<AuthResponse>({
    queryKey: ["signinCheck", sessionKeyBech32],
    queryFn: () => checkSignin(sessionKeyBech32 ?? ""),
    enabled: !!sessionKeyBech32 && !accountData,
    refetchInterval: 1000,
  });

  useEffect(() => {
    if (userData?.authenticated) {
      setAccountData(userData.account);
    }
  }, [userData?.account, userData?.authenticated]);

  const value = useMemo(
    () => ({
      accountData,
      gameData,
      region: bestRegion,
      setGameData,
    }),
    [gameData, bestRegion, accountData],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContextProvider;
