import LeaderboardTable from "../LeaderboardTable";
import Tabs from "../Tabs";

const GlobalLeaderBoard = () => {
  const kills = undefined;
  const items = undefined;
  const secrets = undefined;

  const tabs = [
    {
      id: 0,
      title: "Kills",
      content: kills && <LeaderboardTable data={kills} />,
    },
    {
      id: 1,
      title: "Items",
      content: items && <LeaderboardTable data={items} />,
    },
    {
      id: 2,
      title: "Secret",
      content: secrets && <LeaderboardTable data={secrets} />,
    },
  ];

  return <Tabs tabs={tabs} />;
};

export default GlobalLeaderBoard;
