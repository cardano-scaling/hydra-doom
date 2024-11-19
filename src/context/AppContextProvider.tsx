import { FC, PropsWithChildren, useMemo, useState } from "react";
import { AppContext } from "./useAppContext";
import { Account, EGameType } from "../types";
import useBestRegion from "../hooks/useBestRegion";
import useKeys from "../hooks/useKeys";
import { REGIONS } from "../constants";

const AppContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const keys = useKeys();
  const { bestRegion } = useBestRegion(REGIONS);
  const [gameData, setGameData] = useState({
    code: "",
    petName: "",
    type: EGameType.SOLO,
  });
  const [accountData, setAccountData] = useState<Account>();

  const value = useMemo(
    () => ({
      accountData,
      gameData,
      keys,
      region: bestRegion,
      setAccountData,
      setGameData,
    }),
    [accountData, gameData, bestRegion, keys],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContextProvider;
