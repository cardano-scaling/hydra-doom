import { FC, useEffect, useState } from "react";
import Button from "../Button";
import hydraText from "../../assets/images/hydra-text.png";
import Modal from "../Modal";
import Layout from "../Layout";
import SetNameModal from "../SetNameModal";
import { useAppContext } from "../../context/useAppContext";
import { EGameType } from "../../types";
import LoginModal from "../LoginModal/LoginModal";

interface InitialViewProps {
  startGame: () => void;
}

const InitialView: FC<InitialViewProps> = ({ startGame }) => {
  const { setGameData } = useAppContext();
  const pathSegments = window.location.pathname.split("/").filter(Boolean);
  const [modalData, setModalData] = useState({
    title: "Join Multiplayer",
    submit: () => {
      startGame();
    },
  });
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isNameModalOpen, setIsNameModalOpen] = useState(
    pathSegments[0] === EGameType.JOIN,
  );
  const code = pathSegments[1];

  useEffect(() => {
    if (code) {
      setGameData((prev) => ({ ...prev, code: code, type: EGameType.JOIN }));
    }
  }, [code, setGameData]);

  const handleClickPlaySolo = () => {
    startGame();
    setGameData((prev) => ({
      ...prev,
      code: "",
      petName: "",
      type: EGameType.SOLO,
    }));
  };

  const handleClickStartMultiplayer = () => {
    setModalData({
      title: "New Game",
      submit: () => {
        startGame();
      },
    });
    setIsNameModalOpen(true);
    setGameData((prev) => ({ ...prev, type: EGameType.HOST }));
  };

  const handleClickJoinMultiplayer = () => {
    setModalData({
      title: "Join Multiplayer",
      submit: () => {
        startGame();
      },
    });
    setGameData((prev) => ({ ...prev, type: EGameType.JOIN }));
    setIsNameModalOpen(true);
  };

  const handleTournamentLogin = () => {
    setIsLoginModalOpen(true);
  };

  return (
    <Layout>
      <img
        src={hydraText}
        alt="Hydra"
        className="w-full max-w-5xl relative -bottom-14 -mt-14 z-10 pointer-events-none"
      />
      <div className="flex flex-col gap-6">
        <Button className="w-96 h-16" onClick={handleTournamentLogin}>
          Tournament Login
        </Button>
        <Button className="w-96 h-16" onClick={handleClickPlaySolo}>
          Play Solo
        </Button>
        <Button className="w-96 h-16" onClick={handleClickStartMultiplayer}>
          Start Multiplayer
        </Button>
        <Button className="w-96 h-16" onClick={handleClickJoinMultiplayer}>
          Join Multiplayer
        </Button>
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
      <SetNameModal
        close={() => setIsNameModalOpen(false)}
        isOpen={isNameModalOpen}
        submit={modalData.submit}
        title={modalData.title}
      />
      <LoginModal
        close={() => setIsLoginModalOpen(false)}
        isOpen={isLoginModalOpen}
      />
    </Layout>
  );
};

export default InitialView;
