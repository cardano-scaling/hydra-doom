import DoomCanvas from "../DoomCanvas";
import GlobalTotals from "../GlobalTotals";
import GlobalTPS from "../GlobalTPS";
import Layout from "../Layout";
import MusicPlayer from "../MusicPlayer";
import RestartButton from "../RestartButton";
import TopLinks from "../TopLinks";

const GameView = () => {
  return (
    <Layout>
      <TopLinks />
      <MusicPlayer />
      <RestartButton />
      <div className="grid grid-cols-[20.5rem_1fr_20.5rem] container gap-16 items-center">
        <GlobalTotals size="sm" titleAlign="left" />
        <DoomCanvas />
        <GlobalTPS size="sm" titleAlign="left" />
      </div>
    </Layout>
  );
};

export default GameView;
