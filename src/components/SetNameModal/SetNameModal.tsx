import { ChangeEventHandler, FC, useEffect } from "react";
import Modal from "../Modal";
import { ModalProps } from "../Modal/Modal";
import { FaArrowRotateRight } from "react-icons/fa6";
import Button from "../Button";
import { generateRandomName } from "./petNameWords";
import { useAppContext } from "../../context/useAppContext";
import { MAX_PLAYERS } from "../../constants";

interface SetNameModalProps extends Omit<ModalProps, "children"> {
  submit: () => void;
  title: string;
}

const SetNameModal: FC<SetNameModalProps> = ({
  close,
  isOpen,
  submit,
  title,
}) => {
  const { setGameData, gameData, accountData, players, setPlayers, bots } =
    useAppContext();

  useEffect(() => {
    const petName = accountData ? accountData.auth_name : generateRandomName();
    setGameData((prev) => ({ ...prev, petName }));
  }, [accountData, setGameData]);

  const handleChangeName: ChangeEventHandler<HTMLInputElement> = (e) => {
    setGameData((prev) => ({ ...prev, petName: e.target.value }));
  };

  const handleChangeCode: ChangeEventHandler<HTMLInputElement> = (e) => {
    setGameData((prev) => ({ ...prev, code: e.target.value }));
  };

  const handleGenerateName = () => {
    setGameData((prev) => ({ ...prev, petName: generateRandomName() }));
  };

  const handleSliderChange = (event) => {
    setPlayers(Number(event.target.value));
  };

  const isButtonDisabled =
    (title === "Join Multiplayer" && !gameData.code) || !gameData.petName;

  return (
    <Modal isOpen={isOpen} close={close}>
      <div className="text-center text-4xl flex flex-col gap-12 items-center">
        <h1 className="text-5xl">{title}</h1>
        {title === "Join Multiplayer" && (
          <div className="flex items-center gap-5 justify-center">
            <label htmlFor="code">Code:</label>
            <input
              className="border-2 border-white bg-transparent px-2 h-12 w-80 text-2xl focus:outline-none"
              id="code"
              onChange={handleChangeCode}
              type="text"
              value={gameData.code}
            />
          </div>
        )}
        {accountData ? (
          <div>
            <div className="text-white">
              Playing As:{" "}
              <span className="bg-yellow-400 px-2">
                {accountData.auth_name}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="text-white">Display Name:</div>
              <input
                className="border-2 border-white bg-transparent px-2 h-12 w-72 text-2xl focus:outline-none"
                id="petName"
                onChange={handleChangeName}
                type="text"
                value={gameData.petName}
              />
            </div>
            <button
              className="hover:scale-[1.05] transition-transform"
              onClick={handleGenerateName}
            >
              <FaArrowRotateRight size={26} />
            </button>
          </div>
        )}
        {title !== "Join Multiplayer" && (
          <div className="w-3/4">
            <h2 className="text-4xl font-bold mb-4 text-center">
              Number of Players:
            </h2>
            <input
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-slider"
              max={MAX_PLAYERS}
              min="1"
              onChange={handleSliderChange}
              type="range"
              value={players}
            />
            <div className="flex justify-between text-base text-gray-400 mb-6">
              {Array.from({ length: MAX_PLAYERS }, (_, i) => i + 1).map((i) => (
                <span key={i}>{i}</span>
              ))}
            </div>
            <div className="flex justify-between text-3xl">
              <p className="">
                Players: <span className="font-semibold">{players}</span>
              </p>
              <p className="">
                Bots: <span className="font-semibold">{bots}</span>
              </p>
            </div>
          </div>
        )}
        <Button
          className="text-2xl w-40 h-12"
          disabled={isButtonDisabled}
          onClick={submit}
          tick
        >
          Start
        </Button>
      </div>
    </Modal>
  );
};

export default SetNameModal;
