import { FC, useState } from "react";
import Button from "../Button";
import GlobalLeaderBoard from "../GlobalLeaderBoard";
import GlobalTPS from "../GlobalTPS";
import hydraText from "../../assets/images/hydra-text.png";
import Modal from "../Modal";
import SelectContinentDialog from "../SelectContinentDialog";
import Layout from "../Layout";
import GlobalTotals from "../GlobalTotals";

interface InitialViewProps {
  startGame: () => void;
}

const InitialView: FC<InitialViewProps> = ({ startGame }) => {
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [isSelectContinentModalOpen, setIsSelectContinentModalOpen] =
    useState(false);

  return (
    <Layout>
      <img
        src={hydraText}
        alt="Hydra"
        className="w-full max-w-5xl relative -bottom-14 -mt-14 z-10 pointer-events-none"
      />
      <Button
        className="w-96 h-16"
        onClick={() => setIsSelectContinentModalOpen(true)}
        withDecoration
      >
        Play Doom on Hydra
      </Button>
      <div className="grid grid-cols-2 max-w-6xl w-full mt-32 gap-8 py-6">
        <div className="flex flex-col gap-4">
          <GlobalTotals size="lg" />
          <GlobalTPS size="lg" />
        </div>
        <div>
          <GlobalLeaderBoard />
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
      <SelectContinentDialog
        close={() => setIsSelectContinentModalOpen(false)}
        isOpen={isSelectContinentModalOpen}
        startGame={startGame}
      />
    </Layout>
  );
};

export default InitialView;
