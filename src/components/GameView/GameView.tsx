import Card from "../Card";
import GlobalTotals from "../GlobalTotals";
import GlobalTPS from "../GlobalTPS";
import HydraHeadLiveTxs from "../HydraHeadLiveTxs";
import Layout from "../Layout";
import RestartButton from "../RestartButton";
import StatsCard from "../StatsCard";
import TopLinks from "../TopLinks";

const GameView = () => {
  return (
    <Layout>
      <TopLinks />
      <RestartButton />
      <div className="grid grid-cols-[max-content_1fr_max-content] container gap-16 items-center">
        <div className="w-80 flex flex-col gap-4">
          <GlobalTotals size="sm" titleAlign="left" />
          <StatsCard
            data={[
              { label: "Transactions:", value: "106,791,272" },
              { label: "Bytes:", value: "54,502,739,168" },
              { label: "Kills:", value: "77,808" },
              { label: "Items:", value: "58,999" },
              { label: "Secrets:", value: "1,408" },
              { label: "Play time:", value: "21:08:08:25" },
            ]}
            size="sm"
            titleAlign="left"
            title="Session Totals (72ab3ed...3668f84)"
          />
          <HydraHeadLiveTxs />
        </div>
        <Card className="h-[40rem]">dsad</Card>
        <div className="w-80 flex flex-col gap-4">
          <GlobalTPS size="sm" titleAlign="left" />
          <Card className="text-white py-3 px-4 text-sm leading-3">
            A comparison between the throughput from your game session (bottom)
            and all the Hydra heads in aggregate (top).
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default GameView;
