import { FC } from "react";
import Modal from "../Modal";
import Button from "../Button";

interface SelectContinentDialogProps {
  close: () => void;
  isOpen: boolean;
  startGame: () => void;
}

const continents = [
  { name: "Ohio, NA", value: "us-east-2" },
  { name: "Oregon, NA", value: "us-west-2" },
  { name: "Frankfurt, Europe", value: "eu-central-1" },
  { name: "Cape Town, Africa", value: "af-south-1" },
  { name: "Melbourne, Australia", value: "ap-southeast-4" },
  { name: "Seoul, Asia", value: "ap-northeast-2" },
  { name: "Sao Paulo, SA", value: "sa-east-1" },
];

const SelectContinentDialog: FC<SelectContinentDialogProps> = ({
  close,
  isOpen,
  startGame,
}) => {
  return (
    <Modal isOpen={isOpen} close={close}>
      <h1 className="text-5xl mb-20 text-center">Select your continent</h1>
      <form>
        <ul className="grid grid-cols-2 gap-y-8 text-3xl gap-x-40 mb-20">
          {continents.map((continent) => (
            <li key={continent.value}>
              <label className="flex gap-4 items-center">
                <input
                  className="h-6 w-6"
                  name="continent"
                  type="radio"
                  value={continent.value}
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
