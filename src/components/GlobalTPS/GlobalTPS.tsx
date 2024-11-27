import { FC } from "react";
import { GLOBAL_MAX_SPEED } from "../../constants";
import Card from "../Card";
import Speedometer from "../Speedometer";
import cx from "classnames";
import { useAppContext } from "../../context/useAppContext";

export interface GlobalTPSProps {
  size?: "sm" | "md" | "lg";
  titleAlign?: "left" | "center" | "right";
}

const GlobalTPS: FC<GlobalTPSProps> = ({
  size = "md",
  titleAlign = "center",
}) => {
  const { globalStats } = useAppContext();
  const transactions = globalStats?.txs_per_second ?? 0;

  return (
    <div>
      <h1
        className={cx("text-white uppercase w-full", {
          "text-lg mb-1": size === "sm",
          "text-xl mb-2": size === "md",
          "text-2xl mb-3": size === "lg",
          "text-left": titleAlign === "left",
          "text-center": titleAlign === "center",
          "text-right": titleAlign === "right",
        })}
      >
        Global TPS
      </h1>
      <Card
        glass
        className={cx("flex flex-col items-center", {
          "pt-3 pb-1 px-4": size === "sm",
          "pt-3 pb-1 px-5": size === "md",
          "pt-4 pb-2 px-6": size === "lg",
        })}
      >
        <Speedometer
          maxSpeed={GLOBAL_MAX_SPEED}
          transactions={Math.round(transactions)}
        />
      </Card>
    </div>
  );
};

export default GlobalTPS;
