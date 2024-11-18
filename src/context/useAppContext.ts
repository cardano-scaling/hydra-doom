import { createContext, Dispatch, useContext } from "react";
import { Account, EGameType, GameData } from "../types";

interface AppContextInterface {
  accountData?: Account;
  gameData: GameData;
  region: string | null;
  setGameData: Dispatch<React.SetStateAction<GameData>>;
}

export const AppContext = createContext<AppContextInterface>({
  accountData: undefined,
  gameData: { petName: "", code: "", type: EGameType.SOLO },
  region: null,
  setGameData: () => {},
});

export const useAppContext = () => {
  const context = useContext(AppContext);
  return context;
};
