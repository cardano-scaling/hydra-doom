import { createContext, Dispatch, useContext } from "react";
import { Account, EGameType, GameData, Keys } from "../types";
import { MAX_PLAYERS } from "../constants";

interface AppContextInterface {
  accountData?: Account;
  bots: number;
  gameData: GameData;
  isLoadingUserData: boolean;
  keys: Keys | null;
  players: number;
  region: string | null;
  setAccountData: Dispatch<React.SetStateAction<Account | undefined>>;
  setGameData: Dispatch<React.SetStateAction<GameData>>;
  setPlayers: Dispatch<React.SetStateAction<number>>;
}

export const AppContext = createContext<AppContextInterface>({
  accountData: undefined,
  bots: MAX_PLAYERS - 1,
  gameData: { petName: "", code: "", type: EGameType.SOLO },
  isLoadingUserData: false,
  keys: null,
  players: 1,
  region: null,
  setAccountData: () => {},
  setGameData: () => {},
  setPlayers: () => {},
});

export const useAppContext = () => {
  const context = useContext(AppContext);
  return context;
};
