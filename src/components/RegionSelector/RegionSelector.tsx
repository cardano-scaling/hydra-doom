import { ChangeEventHandler, FC } from "react";
import { REGIONS } from "../../constants";
import { useAppContext } from "../../context/useAppContext";
import { FaStar } from "react-icons/fa6";
import cx from "classnames";

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
                  className={cx(
                    "appearance-none w-7 h-7 rounded-full border-4 border-gray-500 transition-all duration-200 cursor-pointer",
                    "checked:bg-yellow-400 checked:shadow-[0_0_6px_2px_rgba(255,223,0,0.08),0_0_15px_4px_rgba(255,223,0,0.15)]",
                  )}
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
