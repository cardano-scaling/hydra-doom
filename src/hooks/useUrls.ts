import {
  IS_LOCAL,
  LOCAL_HOST,
  LOCAL_GAME_PORT,
  LOCAL_HEALTH_HOST,
  LOCAL_HEALTH_PORT,
} from "../constants";
import { useAppContext } from "../context/useAppContext";

const healthUrl = (region: string) => {
  if (IS_LOCAL) {
    return `http://${LOCAL_HEALTH_HOST}:${LOCAL_HEALTH_PORT}/health`;
  } else {
    return `https://api.${region}.hydra-doom.sundae.fi/health`;
  }
};

const useUrls = () => {
  const { region } = useAppContext();

  if (IS_LOCAL) {
    return {
      newGame: (address: string) =>
        `http://${LOCAL_HOST}:${LOCAL_GAME_PORT}/game/new_game?address=${address}`,
    };
  } else {
    return {
      newGame: (address: string) =>
        `https://api.${region?.value}.hydra-doom.sundae.fi/new_game?address=${address}`,
    };
  }
};

export { useUrls, healthUrl };
