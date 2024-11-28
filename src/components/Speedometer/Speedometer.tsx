import speedometer from "../../assets/images/speedometer.png";
import { FC, useMemo } from "react";
import { mapRange } from "../../utils/speedometer";

interface SpeedometerProps {
  maxSpeed: number;
  transactions: number;
}

const Speedometer: FC<SpeedometerProps> = ({ maxSpeed, transactions }) => {
  const degree = useMemo(
    () => mapRange(transactions, 0, maxSpeed, 0, 180),
    [maxSpeed, transactions],
  );

  return (
    <div className="w-max text-white">
      <div className="relative mb-4">
        <div className="absolute -bottom-1 left-9">0</div>
        <img src={speedometer} alt="Speedometer" className="w-[288px]" />
        <div
          className="speedometer-tick"
          style={{
            transform: `rotate(${degree}deg)`,
          }}
        />
        <div className="absolute -bottom-1 right-9">
          {Math.max(maxSpeed, transactions)}
        </div>
      </div>
      <div className="text-center">{transactions}</div>
    </div>
  );
};

export default Speedometer;
