import { useState } from "react";
import MainBackground from "./components/MainBackground";
import Modal from "./components/Modal";
import Logos from "./components/Logos";
import hydraText from "./assets/images/hydra-text.png";
import Button from "./components/Button";
import GlobalTotals from "./components/GlobalTotals";
import GlobalLeaderBoard from "./components/GlobalLeaderBoard";
import GlobalTPS from "./components/GlobalTPS";

export default function App() {
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);

  return (
    <main className="relative min-h-screen">
      <div className="z-20 relative flex flex-col items-center">
        <Logos />
        <img
          src={hydraText}
          alt="Hydra"
          className="w-full max-w-5xl relative -bottom-14 -mt-14 z-10 pointer-events-none"
        />
        <Button className="w-96 h-16">Play Doom on Hydra</Button>
        <div className="grid grid-cols-2 max-w-6xl w-full mt-32 gap-8">
          <div className="flex flex-col gap-2">
            <GlobalTotals />
            <GlobalTPS />
          </div>
          <div>
            <GlobalLeaderBoard />
          </div>
        </div>
      </div>

      <Modal
        isOpen={isWelcomeModalOpen}
        close={() => setIsWelcomeModalOpen(false)}
      >
        <div className="text-center text-4xl flex flex-col gap-8">
          <h1 className="text-5xl">Welcome to Hydra Doom</h1>
          <p>
            Hydra Doom is a technology demonstration showcasing one of Cardano’s
            scaling solutions called Hydra using the shareware levels of the
            1993 id software game Doom.
          </p>
          <p>
            While you are playing, the game states will be streamed into a Hydra
            head, which uses Cardano smart contracts to validate the game
            transition for every frame, in real time. It’s a passion project put
            together by a small team, including Sundae Labs, Adam Dean, and a
            few folks from IOG, in a short amount of time. All the code is fully
            open sourced.
          </p>
          <p>
            Hydra Doom is intended as a light-hearted tech demo and is not a
            commercial product.
          </p>
        </div>
      </Modal>
      <MainBackground />
    </main>
  );
}
