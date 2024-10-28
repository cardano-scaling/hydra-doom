import { MdContentCopy } from "react-icons/md";
import { ClipboardAPI, useClipboard } from "use-clipboard-copy";
import Card from "../Card";
import DoomCanvas from "../DoomCanvas";
import GlobalTotals from "../GlobalTotals";
import GlobalTPS from "../GlobalTPS";
import HydraHeadLiveTxs from "../HydraHeadLiveTxs";
import Layout from "../Layout";
import MusicPlayer from "../MusicPlayer";
import RestartButton from "../RestartButton";
import StatsCard from "../StatsCard";
import TopLinks from "../TopLinks";
import { useCallback } from "react";
import { FaRegCircleCheck } from "react-icons/fa6";
import { useAppContext } from "../../context/useAppContext";

const GameView = () => {
  const { gameData } = useAppContext();
  const urlClipboard = useClipboard({ copiedTimeout: 1500 });

  const urlClipboardCopy = useCallback(
    (clipboard: ClipboardAPI, value: string) => {
      clipboard.copy(value);
    },
    [],
  );

  const gameUrl = `${window.location.origin}/join/1efabc`;

  return (
    <Layout>
      <TopLinks />
      <MusicPlayer />
      <RestartButton />
      <div className="grid grid-cols-[max-content_1fr_max-content] container gap-16 items-center">
        <div className="w-80 flex flex-col gap-4">
          {/* <GlobalTotals size="sm" titleAlign="left" /> */}
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
        <div className="flex flex-col gap-6">
          <Card className="h-[40rem]">
            <DoomCanvas />
          </Card>
          {gameData.type === "host" && (
            <Card className="px-4 py-2 text-center text-xl text-white flex items-center gap-2 justify-center">
              Share this URL with friends{" "}
              <a
                className="text-yellow-400 underline"
                href={gameUrl}
                target="_blank"
              >
                {gameUrl}
              </a>
              {urlClipboard.copied ? (
                <FaRegCircleCheck className="text-green-600" />
              ) : (
                <MdContentCopy
                  role="button"
                  onClick={() => urlClipboardCopy(urlClipboard, gameUrl)}
                />
              )}
            </Card>
          )}
        </div>
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
