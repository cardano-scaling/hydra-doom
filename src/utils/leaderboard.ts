import { orderBy } from "lodash";
import { LeaderboardEntry } from "../types";
import { TableData } from "../components/Table/Table";

export const getMap = (items?: LeaderboardEntry[]) => {
  return items?.reduce((acc: { [key: string]: number }, [playerId, kills]) => {
    acc[playerId] = kills;
    return acc;
  }, {});
};

export const getTableData = (
  map: { [key: string]: number } | undefined,
  handles: { [key: string]: string },
): TableData[] => {
  if (!map) return [];
  const players = Object.keys(map);
  return orderBy(
    players.map((player) => ({
      player: handles[player],
      score: Number(
        new Intl.NumberFormat("en-US", { notation: "compact" }).format(
          map[player],
        ),
      ),
    })),
    "score",
    "desc",
  ).slice(0, 10);
};
