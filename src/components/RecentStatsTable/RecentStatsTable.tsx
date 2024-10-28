import { FC, useCallback, useEffect, useState } from "react";
import Table, { TableData } from "../Table/Table";
import usePlayersHandle from "../../hooks/usePlayersHandle";
import { getTableData } from "../../utils/leaderboard";
import { PlayerStats } from "../../types";

interface RecentStatsTableProps {
  data: PlayerStats;
}

const RecentStatsTable: FC<RecentStatsTableProps> = ({ data }) => {
  const [tableData, setTableData] = useState<TableData[]>([]);
  const { fetchPlayerHandles } = usePlayersHandle();

  const updateTableData = useCallback(async () => {
    try {
      const players = Object.keys(data);
      const handles = await fetchPlayerHandles(players);

      setTableData(getTableData(data, handles));
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

export default RecentStatsTable;
