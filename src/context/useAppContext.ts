import { createContext, Dispatch, useContext } from "react";
import {
  Account,
  EGameType,
  GameData,
  GameStatistics,
  Keys,
  Region,
} from "../types";

interface AppContextInterface {
  accountData?: Account;
  bestRegion: Region | null;
  bots: number;
  gameData: GameData;
  globalStats?: GameStatistics;
  isLoadingGlobalStats: boolean;
  isLoadingUserData: boolean;
  keys: Keys | null;
  players: number;
  region: Region | null;
  setAccountData: Dispatch<React.SetStateAction<Account | undefined>>;
  setBots: Dispatch<React.SetStateAction<number>>;
  setGameData: Dispatch<React.SetStateAction<GameData>>;
  setPlayers: Dispatch<React.SetStateAction<number>>;
  setRegion: Dispatch<React.SetStateAction<Region | null>>;
}

export const AppContext = createContext<AppContextInterface>({
  accountData: undefined,
  bestRegion: null,
  bots: 1,
  gameData: { petName: "", code: "", type: EGameType.SOLO },
  globalStats: undefined,
  isLoadingGlobalStats: false,
  isLoadingUserData: false,
  keys: null,
  players: 1,
  region: null,
  setAccountData: () => {},
  setBots: () => {},
  setGameData: () => {},
  setPlayers: () => {},
  setRegion: () => {},
});

export const useAppContext = () => {
  const context = useContext(AppContext);
  return context;
};
