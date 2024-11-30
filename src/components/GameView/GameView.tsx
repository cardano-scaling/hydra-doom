import DoomCanvas from "../DoomCanvas";
import GlobalTotals from "../GlobalTotals";
import GlobalTPS from "../GlobalTPS";
import Layout from "../Layout";
import MusicPlayer from "../MusicPlayer";
import RestartButton from "../RestartButton";
import SessionStats from "../SessionStats";
import TopLinks from "../TopLinks";

const GameView = () => {
  return (
    <Layout>
      <TopLinks />
      <MusicPlayer />
      <RestartButton />
      <div className="grid grid-cols-[20.5rem_1fr_20.5rem] container gap-16 items-center">
        <div className="flex flex-col gap-8">
          <GlobalTotals size="sm" titleAlign="left" />
          <SessionStats size="sm" titleAlign="left" />
        </div>
        <div className="flex flex-col gap-6">
          <DoomCanvas />
        </div>
        <GlobalTPS size="sm" titleAlign="left" />
      </div>
    </Layout>
  );
};

export default GameView;
