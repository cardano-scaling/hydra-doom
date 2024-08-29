import Tabs from "../Tabs";

const GlobalLeaderBoard = () => {
  const tabs = [
    {
      id: 0,
      title: "All Time",
      content: (
        <div className="p-6 text-white bg-stone-900">
          Leaderboard content for all time
        </div>
      ),
    },
    {
      id: 1,
      title: "Items",
      content: (
        <div className="p-6 text-white bg-stone-900">
          Leaderboard content for this week
        </div>
      ),
    },
    {
      id: 2,
      title: "Secret",
      content: (
        <div className="p-6 text-white bg-stone-900">
          Leaderboard content for today
        </div>
      ),
    },
  ];

  return <Tabs tabs={tabs} />;
};

export default GlobalLeaderBoard;
