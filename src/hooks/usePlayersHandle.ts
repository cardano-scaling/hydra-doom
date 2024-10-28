import { useCustomCompareCallback } from "use-custom-compare";
import { HANDLE_CACHE_KEY } from "../constants";
import { truncateString } from "../utils/string";
import { useLocalStorage } from "usehooks-ts";
import isEqual from "lodash/isEqual";

const usePlayersHandle = () => {
  const [handles, setHandles] = useLocalStorage<{ [key: string]: string }>(
    HANDLE_CACHE_KEY,
    {},
  );

  const updateCache = useCustomCompareCallback(
    (results: { [key: string]: string }) => {
      setHandles((currentHandles) => ({ ...currentHandles, ...results }));
    },
    [setHandles],
    isEqual,
  );

  const fetchPlayerHandles = useCustomCompareCallback(
    async (players: string[]) => {
      const results: { [key: string]: string } = {};
      const promises = players.map(async (player) => {
        if (handles[player]) {
          results[player] = handles[player];
          return;
        }

        try {
          const response = await fetch(
            `https://auth.hydradoom.fun/v1/session/${player}`,
          );
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();

          results[player] = data.handle
            ? data.handle
            : truncateString(player, 7, 7);
        } catch {
          results[player] = truncateString(player, 7, 7);
        }
      });

      await Promise.all(promises);
      updateCache(results);
      return results;
    },
    [handles, updateCache],
    isEqual,
  );

  return { fetchPlayerHandles };
};

export default usePlayersHandle;
