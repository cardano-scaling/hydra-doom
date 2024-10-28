import speedometer from "../../assets/images/speedometer.png";
import speedometerTick from "../../assets/images/speedometer-tick.png";
import { FC, useEffect, useMemo, useState } from "react";
import { mapRange } from "../../utils/speedometer";

interface SpeedometerProps {
  maxSpeed: number;
  transactions: number;
}

const Speedometer: FC<SpeedometerProps> = ({ maxSpeed, transactions }) => {
  const [recentQueries, setRecentQueries] = useState<
    { timestamp: number; transactions: number }[]
  >([]);
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (
      transactions &&
      transactions !== recentQueries[recentQueries.length - 1]?.transactions
    ) {
      let newRecentQueries;
      const item = {
        timestamp: performance.now(),
        transactions: transactions,
      };
      if (recentQueries.length === 5) {
        newRecentQueries = [...recentQueries.slice(1), item];
        const last = recentQueries[0];
        const difference = transactions - last.transactions;
        const timeDifference = (performance.now() - last.timestamp) / 1000;
        setValue(Math.round(difference / timeDifference));
      } else {
        newRecentQueries = [...recentQueries, item];
      }

      setRecentQueries(newRecentQueries);
    }
  }, [recentQueries, transactions]);

  const degree = useMemo(
    () => mapRange(value, 0, maxSpeed, 0, 180),
    [maxSpeed, value],
  );

  return (
    <div className="w-max text-white">
      <div className="relative mb-3">
        <div className="absolute -bottom-1 left-9">{value}</div>
        <img src={speedometer} alt="Speedometer" className="w-72" />
        <img
          alt="Speedometer tick"
          className="absolute w-28 bottom-0 left-14"
          src={speedometerTick}
          style={{ transform: `rotate(${degree}deg)` }}
        />
        <div className="absolute -bottom-1 right-9">
          {Math.max(maxSpeed, value)}
        </div>
      </div>
      <div className="text-center">0</div>
    </div>
  );
};

export default Speedometer;
