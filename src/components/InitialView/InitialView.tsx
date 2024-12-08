import { FC, useEffect, useState } from "react";
import Button from "../Button";
import hydraText from "../../assets/images/hydra-text.png";
import Modal from "../Modal";
import Layout from "../Layout";
import SetNameModal from "../SetNameModal";
import LoginModal from "../LoginModal/LoginModal";
import { useAppContext } from "../../context/useAppContext";
import { EGameType } from "../../types";
import { useSessionIdKeyCache } from "../../utils/localStorage";
import GlobalTPS from "../GlobalTPS";
import GlobalTotals from "../GlobalTotals";

interface InitialViewProps {
  startGame: () => void;
}

const InitialView: FC<InitialViewProps> = ({ startGame }) => {
  const {
    setGameData,
    accountData,
    isQualified,
    setIsQualified,
    isLoadingUserData,
    setAccountData,
  } = useAppContext();
  const [, setSessionId] = useSessionIdKeyCache();
  const pathSegments = window.location.hash.split("/").filter(Boolean);
  const code = pathSegments[2];
  const [modalTitle, setModalTitle] = useState("Join Multiplayer");
  const [isNameModalOpen, setIsNameModalOpen] = useState(
    pathSegments[1] === EGameType.JOIN,
  );

  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [displayActionButtons, setDisplayActionButtons] = useState(false);

  useEffect(() => {
    if (code) {
      setGameData((prev) => ({ ...prev, code, type: EGameType.JOIN }));
    }
  }, [code, setGameData]);

  const handleClickStartMultiplayer = () => {
    setModalTitle("New Game");
    setIsNameModalOpen(true);
    setGameData((prev) => ({ ...prev, type: EGameType.HOST }));
  };

  const handleClickJoinMultiplayer = () => {
    setModalTitle("Join Multiplayer");
    setIsNameModalOpen(true);
    setGameData((prev) => ({ ...prev, type: EGameType.JOIN }));
  };

  const handleTournamentLogin = () => {
    setIsLoginModalOpen(true);
  };

  const handleSubmitNameModal = () => {
    setIsNameModalOpen(false);
    startGame();
  };

  const showActionButtons = () => {
    setDisplayActionButtons(true);
  };

  const onLogout = () => {
    setAccountData(undefined);
    setIsQualified(false);
    setSessionId("");
  };

  const renderButtons = () => {
    if (isLoadingUserData) {
      return <div className="h-72 flex items-center text-3xl">Loading...</div>;
    }

    if (displayActionButtons || accountData) {
      return (
        <>
          {accountData ? (
            <div className="flex-col">
              <div className="flex items-center gap-6 justify-center mb-8">
                <div className="text-3xl">
                  Logged In as:{" "}
                  <span className="text-white text-shadow-custom">
                    {accountData.auth_name}
                  </span>
                </div>
                <Button className="text-xl w-36 h-11" onClick={onLogout} tick>
                  Logout
                </Button>
              </div>
              {!isQualified ? (
                <>
                  <div className="flex items-center gap-6 justify-center mb-8">
                    <span className="text-white text-3xl text-shadow-custom">
                      Unfortunately, you have not qualified for the next stage
                      of the tournament.
                    </span>
                  </div>
                  <div className="text-center text-5xl mb-8">Free Play</div>
                </>
              ) : (
                <div className="flex-col items-center gap-6 justify-center text-center mb-8">
                  <div className="text-white text-3xl text-shadow-custom">
                    Congratulations, you've qualified! Your next steps:
                  </div>
                  <div className="text-white text-3xl text-shadow-custom">
                    1) Connect your Discord to your tournament account{" "}
                    <a
                      target="_blank"
                      href="https://rewardengine.dripdropz.io/leaderboard/d93212b3-dbdc-40d0-befd-f90508c6232d"
                      className="text-black hover:text-red-800"
                    >
                      here
                    </a>
                  </div>
                  <div className="text-white text-3xl text-shadow-custom">
                    2) Join our{" "}
                    <a
                      target="_blank"
                      href="https://discord.gg/mAJkTqAuAM"
                      className="text-black hover:text-red-800"
                    >
                      Discord server
                    </a>{" "}
                    for matchmaking & more information
                  </div>

                  <div className="mt-8 text-center text-5xl mb-8">
                    Free Play
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-5xl mb-8">Free Play</div>
          )}
          <Button className="w-96 h-16" onClick={handleClickStartMultiplayer}>
            New Game
          </Button>
          <Button className="w-96 h-16" onClick={handleClickJoinMultiplayer}>
            Join Game
          </Button>
        </>
      );
    }

    return (
      <>
        {Date.now() > 1733670000000 && (
          <Button className="w-96 h-16" onClick={handleTournamentLogin}>
            Tournament Login
          </Button>
        )}
        <Button className="w-96 h-16" onClick={showActionButtons}>
          Free Play
        </Button>
      </>
    );
  };

  return (
    <Layout>
      <img
        src={hydraText}
        alt="Hydra"
        className="w-full max-w-5xl relative -bottom-14 -mt-14 z-10 pointer-events-none"
      />
      <div className="flex flex-col gap-6 items-center mb-10">
        {renderButtons()}
      </div>
      <div className="grid grid-cols-2 gap-52 w-full max-w-5xl">
        <GlobalTotals />
        <GlobalTPS />
      </div>
      {isWelcomeModalOpen && (
        <Modal
          isOpen={isWelcomeModalOpen}
          close={() => setIsWelcomeModalOpen(false)}
        >
          <div className="text-center text-4xl flex flex-col gap-8">
            <h1 className="text-5xl">Welcome to Hydra Doom</h1>
            <p>
              Hydra Doom is a technology demonstration showcasing one of
              Cardano’s scaling solutions called Hydra using the shareware
              levels of the 1993 id software game Doom.
            </p>
            <p>
              While you are playing, the game states will be streamed into a
              Hydra head, which uses Cardano smart contracts to validate the
              game transition for every frame, in real time. It’s a passion
              project put together by a small team, including Sundae Labs, Adam
              Dean, and a few folks from IOG, in a short amount of time. All the
              code is fully open sourced.
            </p>
            <p>
              Hydra Doom is intended as a light-hearted tech demo and is not a
              commercial product.
            </p>
          </div>
        </Modal>
      )}
      <SetNameModal
        close={() => setIsNameModalOpen(false)}
        isOpen={isNameModalOpen}
        submit={handleSubmitNameModal}
        title={modalTitle}
      />
      <LoginModal
        close={() => setIsLoginModalOpen(false)}
        isOpen={isLoginModalOpen}
        showActionButtons={showActionButtons}
      />
    </Layout>
  );
};

export default InitialView;
