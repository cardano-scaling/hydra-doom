import { FC, PropsWithChildren, useMemo, useState } from "react";
import { AppContext } from "./useAppContext";
import { EGameType } from "../types";
import useBestRegion from "../hooks/useBestRegion";
import { REGIONS } from "../constants";

const AppContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const { bestRegion } = useBestRegion(REGIONS);
  const [gameData, setGameData] = useState({
    code: "",
    petName: "",
    type: EGameType.SOLO,
  });

  const value = useMemo(
    () => ({
      gameData,
      region: bestRegion,
      setGameData,
    }),
    [gameData, bestRegion],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContextProvider;
