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
  isUserDataFetched: boolean;
  isLoadingGlobalStats: boolean;
  isLoadingUserData: boolean;
  isQualified: boolean;
  keys: Keys | null;
  players: number;
  region: Region | null;
  setAccountData: Dispatch<React.SetStateAction<Account | undefined>>;
  setBots: Dispatch<React.SetStateAction<number>>;
  setGameData: Dispatch<React.SetStateAction<GameData>>;
  setIsQualified: Dispatch<React.SetStateAction<boolean>>;
  setPlayers: Dispatch<React.SetStateAction<number>>;
  setRegion: Dispatch<React.SetStateAction<Region | null>>;
}

export const AppContext = createContext<AppContextInterface>({
  accountData: undefined,
  bestRegion: null,
  bots: 1,
  gameData: { petName: "", code: "", type: EGameType.SOLO },
  globalStats: undefined,
  isUserDataFetched: false,
  isLoadingGlobalStats: false,
  isLoadingUserData: false,
  isQualified: false,
  keys: null,
  players: 1,
  region: null,
  setAccountData: () => {},
  setBots: () => {},
  setGameData: () => {},
  setIsQualified: () => {},
  setPlayers: () => {},
  setRegion: () => {},
});

export const useAppContext = () => {
  const context = useContext(AppContext);
  return context;
};
