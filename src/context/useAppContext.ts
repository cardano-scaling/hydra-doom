import { createContext, Dispatch, useContext } from "react";
import { Account, EGameType, GameData, Keys, Region } from "../types";
import { MAX_PLAYERS } from "../constants";

interface AppContextInterface {
  accountData?: Account;
  bestRegion: Region | null;
  bots: number;
  gameData: GameData;
  isLoadingUserData: boolean;
  keys: Keys | null;
  players: number;
  region: Region | null;
  setAccountData: Dispatch<React.SetStateAction<Account | undefined>>;
  setGameData: Dispatch<React.SetStateAction<GameData>>;
  setPlayers: Dispatch<React.SetStateAction<number>>;
  setRegion: Dispatch<React.SetStateAction<Region | null>>;
}

export const AppContext = createContext<AppContextInterface>({
  accountData: undefined,
  bestRegion: null,
  bots: MAX_PLAYERS - 1,
  gameData: { petName: "", code: "", type: EGameType.SOLO },
  isLoadingUserData: false,
  keys: null,
  players: 1,
  region: null,
  setAccountData: () => {},
  setGameData: () => {},
  setPlayers: () => {},
  setRegion: () => {},
});

export const useAppContext = () => {
  const context = useContext(AppContext);
  return context;
};
