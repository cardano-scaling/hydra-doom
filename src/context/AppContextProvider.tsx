import { FC, PropsWithChildren, useMemo, useState } from "react";
import { AppContext } from "./useAppContext";
import { REGIONS } from "../constants";
import { EGameType, Region } from "../types";

const AppContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const [gameData, setGameData] = useState({
    code: "",
    petName: "",
    type: EGameType.SOLO,
  });

  const [region, setRegion] = useState<Region>(REGIONS[0]);

  const value = useMemo(
    () => ({
      gameData,
      region,
      setGameData,
      setRegion,
    }),
    [gameData, region],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContextProvider;
