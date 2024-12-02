import { FC } from "react";
import StatsCard from "../StatsCard";
import { StatsCardProps } from "../StatsCard/StatsCard";
import { useAppContext } from "../../context/useAppContext";
import { formatNumber } from "../../utils/numbers";
import { useQuery } from "@tanstack/react-query";
import { fetchSessionStats } from "../../utils/requests";
import { SessionStatsInterface } from "../../types";
import { FaStar } from "react-icons/fa6";
import cx from "classnames";
import { Tooltip } from "react-tooltip";

const SessionStats: FC<Pick<StatsCardProps, "size" | "titleAlign">> = ({
  size,
  titleAlign,
}) => {
  const { keys, accountData } = useAppContext();
  const { publicKeyHashHex = "" } = keys || {};

  const { data } = useQuery<SessionStatsInterface>({
    queryKey: ["sessionStats", publicKeyHashHex],
    queryFn: () => fetchSessionStats(publicKeyHashHex),
    enabled: !!publicKeyHashHex && !!accountData,
    refetchInterval: 6000, // 6 seconds
  });

  const death = data?.overview.death || 0;
  const game_started = data?.overview.game_started || 0;
  const kill = data?.overview.kill || 0;

  const stats = [
    {
      id: "games-played",
      label: "Games Played:",
      value: game_started,
      showStar: game_started > 0,
      starColor: game_started >= 4 ? "text-yellow-400" : "text-white",
      tooltip: (
        <Tooltip anchorSelect="#games-played">
          <div>Pass qualifier: 1</div>
          <div>Achievement: 4</div>
        </Tooltip>
      ),
    },
    {
      id: "kills",
      label: "Kills:",
      value: kill,
      showStar: kill >= 25,
      starColor: kill >= 50 ? "text-yellow-400" : "text-white",
      tooltip: (
        <Tooltip anchorSelect="#kills">
          <div>Pass qualifier: 25</div>
          <div>Achievement: 50</div>
        </Tooltip>
      ),
    },
    {
      id: "deaths",
      label: "Deaths:",
      value: death,
      showStar: false,
      starColor: null,
    },
  ];

  const formattedStats = stats.map(
    ({ label, value, showStar, starColor, tooltip, id }) => {
      const formattedValue = formatNumber(value);
      return {
        label,
        value: showStar ? (
          <div className="flex items-center gap-4 w-fit">
            <div className="w-5">{formattedValue}</div>
            <FaStar className={cx("text-base", starColor)} id={id} />
            {tooltip}
          </div>
        ) : (
          formattedValue
        ),
      };
    },
  );

  if (!accountData) return null;

  return (
    <StatsCard
      data={formattedStats}
      size={size}
      title="Player Stats"
      titleAlign={titleAlign}
    />
  );
};

export default SessionStats;
