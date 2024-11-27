import { ChangeEventHandler, FC, useEffect } from "react";
import Modal from "../Modal";
import { ModalProps } from "../Modal/Modal";
import { FaArrowRotateRight } from "react-icons/fa6";
import Button from "../Button";
import { generateRandomName } from "./petNameWords";
import { useAppContext } from "../../context/useAppContext";
import { MAX_PLAYERS } from "../../constants";
import RegionSelector from "../RegionSelector";

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
      <div className="text-center text-4xl flex flex-col gap-12">
        <h1 className="text-5xl mb-6">{title}</h1>
        <div className="grid grid-cols-2 gap-6">
          {title === "Join Multiplayer" && (
            <div className="border-2 border-white px-6 pt-4 pb-3 relative">
              <label
                htmlFor="code"
                className="absolute -top-5 left-6 bg-[#1D1715] text-white px-2 text-3xl"
              >
                Code
              </label>
              <input
                className="bg-transparent px-2 h-12 text-2xl focus:outline-none w-full"
                id="code"
                onChange={handleChangeCode}
                type="text"
                value={gameData.code}
              />
            </div>
          )}
          {accountData ? (
            <div className="border-2 border-white px-6 pt-7 pb-3 relative">
              <div className="absolute -top-5 left-6 bg-[#1D1715] text-white px-2 text-3xl">
                Playing As
              </div>
              <div className="text-4xl text-left">{accountData.auth_name}</div>
            </div>
          ) : (
            <div className="border-2 border-white px-6 pt-4 pb-3 relative">
              <label
                htmlFor="petName"
                className="absolute -top-5 left-6 bg-[#1D1715] text-white px-2 text-3xl"
              >
                Display Name
              </label>
              <input
                className="bg-transparent px-2 h-12 w-80 text-3xl focus:outline-none"
                id="petName"
                onChange={handleChangeName}
                type="text"
                value={gameData.petName}
              />
              <button
                className="hover:scale-[1.05] transition-transform"
                onClick={handleGenerateName}
              >
                <FaArrowRotateRight size={26} />
              </button>
            </div>
          )}
        </div>
        {title !== "Join Multiplayer" && (
          <>
            <div className="border-2 border-white px-6 pt-8 pb-6 relative">
              <label className="absolute -top-5 left-6 bg-[#1D1715] text-white px-2 text-3xl">
                Number of Players
              </label>
              <input
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-slider"
                max={MAX_PLAYERS}
                min="1"
                onChange={handleSliderChange}
                type="range"
                value={players}
              />
              <div className="flex justify-between text-base text-gray-400 mb-6">
                {Array.from({ length: MAX_PLAYERS }, (_, i) => i + 1).map(
                  (i) => (
                    <span key={i}>{i}</span>
                  ),
                )}
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
            <RegionSelector />
          </>
        )}
        <Button
          className="w-96 h-16 text-4xl mx-auto"
          disabled={isButtonDisabled}
          onClick={submit}
        >
          Start
        </Button>
      </div>
    </Modal>
  );
};

export default SetNameModal;
