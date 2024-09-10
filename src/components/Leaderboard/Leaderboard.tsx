import { useAppContext } from "../../context/useAppContext";
import LeaderboardTable from "../LeaderboardTable";
import RecentStatsTable from "../RecentStatsTable";
import Tabs from "../Tabs";

const Leaderboard = () => {
  const { globalQuery } = useAppContext();
  const kills = globalQuery?.data?.kills_leaderboard;
  const items = globalQuery?.data?.items_leaderboard;
  const secrets = globalQuery?.data?.secrets_leaderboard;

  const recentKills = globalQuery?.data?.kills;
  const recentItems = globalQuery?.data?.items;
  const recentSecrets = globalQuery?.data?.secrets;

  const allTimeData = [
    { title: "Kills", data: kills },
    { title: "Items", data: items },
    { title: "Secrets", data: secrets },
  ];

  const recentData = [
    { title: "Kills", data: recentKills },
    { title: "Items", data: recentItems },
    { title: "Secrets", data: recentSecrets },
  ];

  const tabs = [
    {
      id: 0,
      title: "Recent",
      content: (
        <div className="grid grid-cols-3 gap-6 pt-6">
          {recentData.map(({ title, data }) => (
            <div key={title}>
              <h2 className="text-2xl text-center mb-6">{title}</h2>
              {data && <RecentStatsTable data={data} />}
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 1,
      title: "All Time",
      content: (
        <div className="grid grid-cols-3 gap-6 pt-6">
          {allTimeData.map(({ title, data }) => (
            <div key={title}>
              <h2 className="text-2xl text-center mb-6">{title}</h2>
              {data && <LeaderboardTable data={data} />}
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="text-center flex flex-col gap-10 min-w-[64rem]">
      <h1 className="text-5xl">Leaderboard</h1>
      <Tabs tabs={tabs} />
    </div>
  );
};

export default Leaderboard;
