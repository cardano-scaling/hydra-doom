import { FC, useCallback, useEffect, useState } from "react";
import Table, { TableData } from "../Table/Table";
import usePlayersHandle from "../../hooks/usePlayersHandle";
import { getMap, getTableData } from "../../utils/leaderboard";
import { LeaderboardEntry } from "../../types";

interface LeaderboardTableProps {
  data: LeaderboardEntry[];
}

const LeaderboardTable: FC<LeaderboardTableProps> = ({ data }) => {
  const [tableData, setTableData] = useState<TableData[]>([]);
  const { fetchPlayerHandles } = usePlayersHandle();

  const updateTableData = useCallback(async () => {
    try {
      const map = getMap(data);

      if (!map) return;

      const players = Object.keys(map);
      const handles = await fetchPlayerHandles(players);

      setTableData(getTableData(map, handles));
    } catch (error) {
      console.error("Failed to fetch player handles:", error);
    }
  }, [data, fetchPlayerHandles]);

  useEffect(() => {
    updateTableData();
  }, [updateTableData]);

  if (!tableData.length) return null;

  return (
    <Table columns={[{ name: "player" }, { name: "score" }]} data={tableData} />
  );
};

export default LeaderboardTable;
