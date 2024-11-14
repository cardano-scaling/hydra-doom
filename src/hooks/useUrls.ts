import { IS_LOCAL } from "../constants";
import { useAppContext } from "../context/useAppContext";

const useUrls = () => {
  const { region } = useAppContext();

  if (IS_LOCAL) {
    return {
      health: () => "http://localhost:3000/health",
      newGame: (address: string) =>
        `http://localhost:3000/new_game?address=${address}`,
      addPlayer: (address: string, code: string) =>
        `http://localhost:3000/add_player?address=${address}&id=${code}`,
      share: (code?: string) =>
        code ? `http://localhost:3000/join/${code}` : "",
    };
  } else {
    return {
      health: () => `https://api.${region}.hydra-doom.sundae.fi/health`,
      newGame: (address: string) =>
        `https://api.${region}.hydra-doom.sundae.fi/new_game?address=${address}`,
      addPlayer: (address: string, code: string) =>
        `https://api.${region}.hydra-doom.sundae.fi/add_player?address=${address}&id=${code}`,
      share: (code?: string) =>
        code ? `${window.location.origin}/join/${code}` : "",
    };
  }
};

export default useUrls;
