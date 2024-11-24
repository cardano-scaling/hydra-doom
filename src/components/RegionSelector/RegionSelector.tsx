import { ChangeEventHandler, FC } from "react";
import { REGIONS } from "../../constants";
import { useAppContext } from "../../context/useAppContext";
import { FaStar } from "react-icons/fa6";

const RegionSelector: FC = () => {
  const { region, setRegion, bestRegion } = useAppContext();

  const handleChangeRegion: ChangeEventHandler<HTMLInputElement> = (e) => {
    const selectedRegion =
      REGIONS.find(({ value }) => value === e.target.value) || null;
    setRegion(selectedRegion);
  };

  return (
    <div className="border-2 border-white px-6 pt-8 pb-6 relative">
      <label className="absolute -top-5 left-6 bg-[#1D1715] text-white px-2 text-3xl">
        Region
      </label>
      <form>
        <ul className="grid grid-cols-2 gap-y-8 text-3xl gap-x-40">
          {REGIONS.map(({ value, name }) => (
            <li key={value}>
              <label className="flex gap-4 items-center cursor-pointer">
                <input
                  checked={value === region?.value}
                  className="h-6 w-6"
                  name="region"
                  onChange={handleChangeRegion}
                  type="radio"
                  value={value}
                />
                {name}
                {bestRegion?.value === value && <FaStar />}
              </label>
            </li>
          ))}
        </ul>
      </form>
    </div>
  );
};

export default RegionSelector;
