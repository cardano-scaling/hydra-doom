import { ChangeEventHandler, FC, useEffect } from "react";
import Modal from "../Modal";
import { ModalProps } from "../Modal/Modal";
import { FaArrowRotateRight } from "react-icons/fa6";
import Button from "../Button";
import { generateRandomName } from "./petNameWords";
import { useAppContext } from "../../context/useAppContext";
import { MAX_PLAYERS } from "../../constants";
import RegionSelector from "../RegionSelector";
import cx from "classnames";

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
  const {
    accountData,
    bots,
    gameData,
    players,
    region,
    setBots,
    setGameData,
    setPlayers,
  } = useAppContext();

  useEffect(() => {
    const petName = accountData ? accountData.auth_name : generateRandomName();
    setGameData((prev) => ({ ...prev, petName }));
  }, [accountData, setGameData]);

  const handleChangeName: ChangeEventHandler<HTMLInputElement> = (e) => {
    setGameData((prev) => ({ ...prev, petName: e.target.value }));
  };

  const handleGenerateName = () => {
    setGameData((prev) => ({ ...prev, petName: generateRandomName() }));
  };

  return (
    <Modal isOpen={isOpen} close={close}>
      <div className="text-center text-4xl flex flex-col gap-12 px-24">
        <h1 className="text-5xl mb-6">{title}</h1>

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

        <Button className="w-96 h-16 text-4xl mx-auto" onClick={submit}>
          Let's Go
        </Button>
      </div>
    </Modal>
  );
};

export default SetNameModal;
