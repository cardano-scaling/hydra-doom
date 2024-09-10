import { ChangeEventHandler, FC } from "react";
import Modal from "../Modal";
import Button from "../Button";
import { REGIONS } from "../../constants";
import { useAppContext } from "../../context/useAppContext";

interface SelectContinentDialogProps {
  close: () => void;
  isOpen: boolean;
  startGame: () => void;
}

const SelectContinentDialog: FC<SelectContinentDialogProps> = ({
  close,
  isOpen,
  startGame,
}) => {
  const { region, setRegion } = useAppContext();

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    setRegion(REGIONS.find((r) => r.value === event.target.value)!);
  };

  return (
    <Modal isOpen={isOpen} close={close}>
      <h1 className="text-5xl mb-20 text-center">Select your continent</h1>
      <form>
        <ul className="grid grid-cols-2 gap-y-8 text-3xl gap-x-40 mb-20">
          {REGIONS.map((continent) => (
            <li key={continent.value}>
              <label className="flex gap-4 items-center cursor-pointer">
                <input
                  className="h-6 w-6 cursor-pointer"
                  name="continent"
                  type="radio"
                  value={continent.value}
                  checked={continent.value === region.value}
                  onChange={handleChange}
                />
                {continent.name}
              </label>
            </li>
          ))}
        </ul>
        <Button className="w-96 h-16 mx-auto" onClick={startGame}>
          Start Game
        </Button>
      </form>
    </Modal>
  );
};

export default SelectContinentDialog;
