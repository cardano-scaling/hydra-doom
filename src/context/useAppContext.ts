import { createContext, Dispatch, useContext } from "react";
import { Account, EGameType, GameData, Keys } from "../types";

interface AppContextInterface {
  accountData?: Account;
  gameData: GameData;
  isLoadingUserData: boolean;
  keys: Keys | null;
  region: string | null;
  setAccountData: Dispatch<React.SetStateAction<Account | undefined>>;
  setGameData: Dispatch<React.SetStateAction<GameData>>;
}

export const AppContext = createContext<AppContextInterface>({
  accountData: undefined,
  gameData: { petName: "", code: "", type: EGameType.SOLO },
  isLoadingUserData: false,
  keys: null,
  region: null,
  setAccountData: () => {},
  setGameData: () => {},
});

export const useAppContext = () => {
  const context = useContext(AppContext);
  return context;
};
