import { FC } from "react";
import StatsCard from "../StatsCard";
import { StatsCardProps } from "../StatsCard/StatsCard";
import { useAppContext } from "../../context/useAppContext";
import { formatNumber } from "../../utils/numbers";
const GlobalTotals: FC<Pick<StatsCardProps, "size" | "titleAlign">> = ({
  size,
  titleAlign,
}) => {
  const { globalStats } = useAppContext();

  const {
    active_games,
    active_players,
    total_bots,
    total_bytes,
    total_games,
    total_kills,
    total_txs,
    total_players,
  } = globalStats || {};

  return (
    <StatsCard
      data={[
        { label: "Transactions:", value: formatNumber(total_txs) },
        { label: "Bytes:", value: formatNumber(total_bytes) },
        { label: "Games (all-time):", value: formatNumber(total_games) },
        { label: "Games (active):", value: formatNumber(active_games) },
        { label: "Players (all-time):", value: formatNumber(total_players) },
        { label: "Player (active):", value: formatNumber(active_players) },
        { label: "Bots:", value: formatNumber(total_bots) },
        { label: "Kills:", value: formatNumber(total_kills) },
      ]}
      size={size}
      title="Global Totals"
      titleAlign={titleAlign}
    />
  );
};
export default GlobalTotals;
