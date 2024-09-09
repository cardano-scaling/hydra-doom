import { useAppContext } from "../../context/useAppContext";
import LeaderboardTable from "../LeaderboardTable";
import Table from "../Table";
import Tabs from "../Tabs";

const Leaderboard = () => {
  const { globalQuery } = useAppContext();
  const kills = globalQuery?.data?.kills_leaderboard;
  const items = globalQuery?.data?.items_leaderboard;
  const secrets = globalQuery?.data?.secrets_leaderboard;

  const allTimeData = [
    { title: "Kills", data: kills },
    { title: "Items", data: items },
    { title: "Secrets", data: secrets },
  ];

  const tabs = [
    {
      id: 0,
      title: "Recent",
      content: (
        <div className="grid grid-cols-3 gap-6 pt-6">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <h2 className="text-2xl text-center mb-6">Kills</h2>
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
    <div className="text-center flex flex-col gap-10">
      <h1 className="text-5xl">Leaderboard</h1>
      <Tabs tabs={tabs} />
    </div>
  );
};

export default Leaderboard;
