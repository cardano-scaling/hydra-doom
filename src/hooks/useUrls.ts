import { IS_LOCAL } from "../constants";
import { useAppContext } from "../context/useAppContext";

const healthUrl = (region: string) => {
  if (IS_LOCAL) {
    return `http://localhost:3000/health`;
  } else {
    return `https://api.${region}.hydra-doom.sundae.fi/health`;
  }
};

const useUrls = () => {
  const { region, players, bots } = useAppContext();

  if (IS_LOCAL) {
    return {
      newGame: (address: string) =>
        `http://localhost:3000/new_game?address=${address}&player_count=${players}&bot_count=${bots}`,
      addPlayer: (address: string, code: string) =>
        `http://localhost:3000/add_player?address=${address}&id=${code}`,
      share: (code?: string) =>
        code ? `http://localhost:3000/join/${code}` : "",
    };
  } else {
    return {
      newGame: (address: string) =>
        `https://api.${region?.value}.hydra-doom.sundae.fi/new_game?address=${address}&player_count=${players}&bot_count=${bots}`,
      addPlayer: (address: string, code: string) =>
        `https://api.${region?.value}.hydra-doom.sundae.fi/add_player?address=${address}&id=${code}`,
      share: (code?: string) =>
        code ? `${window.location.origin}/join/${code}` : "",
    };
  }
};

export { useUrls, healthUrl };
