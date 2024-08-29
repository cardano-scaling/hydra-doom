import Table from "../Table";
import Tabs from "../Tabs";

const GlobalLeaderBoard = () => {
  const tabs = [
    {
      id: 0,
      title: "Kills",
      content: (
        <Table
          columns={[{ name: "player" }, { name: "score" }]}
          data={[
            { player: "Player 1", score: "1000" },
            { player: "Player 2", score: "900" },
            { player: "Player 3", score: "800" },
            { player: "Player 4", score: "700" },
            { player: "Player 5", score: "600" },
            { player: "Player 6", score: "500" },
            { player: "Player 7", score: "400" },
            { player: "Player 8", score: "300" },
            { player: "Player 9", score: "200" },
            { player: "Player 10", score: "100" },
          ]}
        />
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
