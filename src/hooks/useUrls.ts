import { IS_LOCAL, LOCAL_HOST, REGIONS } from "../constants";
import { useAppContext } from "../context/useAppContext";

const healthUrl = (region: string) => {
  if (IS_LOCAL) {
    return `http://${LOCAL_HOST}:3000/health`;
  } else {
    return `https://api.${region}.hydra-doom.sundae.fi/health`;
  }
};

const useUrls = () => {
  const { region, players, bots } = useAppContext();

  if (IS_LOCAL) {
    return {
      newGame: (address: string) =>
        `http://${LOCAL_HOST}:8000/game/new_game?address=${address}&player_count=${players}&bot_count=${bots}`,
      addPlayer: (address: string, code: string) =>
        `http://${LOCAL_HOST}:8000/game/add_player?address=${address}&id=${code}`,
      share: (code?: string) =>
        code ? `http://${LOCAL_HOST}:3000/join/${code}` : "",
    };
  } else {
    return {
      newGame: (address: string) =>
        `https://api.${region?.value}.hydra-doom.sundae.fi/new_game?address=${address}&player_count=${players}&bot_count=${bots}`,
      addPlayer: (address: string, code: string) => {
        let gameRegion = REGIONS.find((r) => r.prefix == code[0]);
        return `https://api.${gameRegion?.value}.hydra-doom.sundae.fi/add_player?address=${address}&id=${code}`;
      },
      share: (code?: string) =>
        code ? `${window.location.origin}/#/join/${code}` : "",
    };
  }
};

export { useUrls, healthUrl };
