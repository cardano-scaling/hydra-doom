import { FC, useCallback, useMemo } from "react";
import StatsCard from "../StatsCard";
import { StatsCardProps } from "../StatsCard/StatsCard";
import { useAppContext } from "../../context/useAppContext";
import { formatNumber, formatPlayTime } from "../../utils/numbers";
import { PlayerStats } from "../../types";

const GlobalTotals: FC<Pick<StatsCardProps, "size" | "titleAlign">> = ({
  size,
  titleAlign,
}) => {
  const { globalQuery } = useAppContext();

  const getTotal = useCallback((stats?: PlayerStats, total?: number) => {
    if (!stats || total === undefined) return "-";

    let count = total;
    for (const player in stats ?? []) {
      count += stats[player];
    }
    return formatNumber(count);
  }, []);

  const playTime = useMemo(() => {
    if (!globalQuery?.data) return "-";

    const { total_play_time, player_play_time } = globalQuery.data;
    let totalPlayTime = total_play_time;

    for (const player in player_play_time ?? []) {
      for (const time of player_play_time[player] ?? []) {
        totalPlayTime += time;
      }
    }
    return formatPlayTime(totalPlayTime);
  }, [globalQuery?.data]);

  if (!globalQuery?.data) return null;

  const { data } = globalQuery;

  return (
    <StatsCard
      data={[
        { label: "Games (all-time):", value: formatNumber(data.total_games) },
        { label: "Games (active):", value: formatNumber(data.active_games) },
        { label: "Transactions:", value: formatNumber(data.transactions) },
        { label: "Bytes:", value: formatNumber(data.bytes) },
        { label: "Kills:", value: getTotal(data.kills, data.total_kills) },
        { label: "Items:", value: getTotal(data.items, data.total_items) },
        {
          label: "Secrets:",
          value: getTotal(data.secrets, data.total_secrets),
        },
        { label: "Play time:", value: playTime },
      ]}
      size={size}
      title="Global Totals"
      titleAlign={titleAlign}
    />
  );
};

export default GlobalTotals;
