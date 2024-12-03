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

  const overviewStatsData = {
    death: data?.overview.death || 0,
    game_started: data?.overview.game_started || 0,
    kill: data?.overview.kill || 0,
  };

  const overViewStats = [
    {
      id: "games-played",
      label: "Games Played:",
      value: overviewStatsData.game_started,
      showStar: overviewStatsData.game_started > 0,
      starColor:
        overviewStatsData.game_started >= 4 ? "text-yellow-400" : "text-white",
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
      value: overviewStatsData.kill,
      showStar: overviewStatsData.kill >= 25,
      starColor:
        overviewStatsData.kill >= 50 ? "text-yellow-400" : "text-white",
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
      value: overviewStatsData.death,
      showStar: false,
      starColor: null,
    },
  ];

  const formattedOverviewStats = overViewStats.map(
    ({ label, value, showStar, tooltip }) => {
      const formattedValue = formatNumber(value);
      return {
        label,
        value: showStar ? (
          <div className="flex items-center gap-4 w-fit">
            <div className="w-5">{formattedValue}</div>
            {tooltip}
          </div>
        ) : (
          formattedValue
        ),
      };
    },
  );

  const qualifierStatsData = {
    death: data?.qualifier.death || 0,
    game_started: data?.qualifier.game_started || 0,
    kill: data?.qualifier.kill || 0,
  };

  const qualifierStats = [
    {
      id: "games-played",
      label: "Games Played:",
      value: qualifierStatsData.game_started,
      showStar: qualifierStatsData.game_started > 0,
      starColor:
        qualifierStatsData.game_started >= 4 ? "text-yellow-400" : "text-white",
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
      value: qualifierStatsData.kill,
      showStar: qualifierStatsData.kill >= 25,
      starColor:
        qualifierStatsData.kill >= 50 ? "text-yellow-400" : "text-white",
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
      value: qualifierStatsData.death,
      showStar: false,
      starColor: null,
    },
  ];

  const formattedQualifierStats = qualifierStats.map(
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
    <div className="flex flex-col gap-4">
      <StatsCard
        data={formattedOverviewStats}
        size={size}
        title="Overall Player Stats"
        titleAlign={titleAlign}
      />
      <StatsCard
        data={formattedQualifierStats}
        size={size}
        title="Tournament Stats"
        titleAlign={titleAlign}
      />
    </div>
  );
};

export default SessionStats;
