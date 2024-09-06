import { FC } from "react";
import Card from "../Card";
import cx from "classnames";

interface StatsCardProps {
  data: { label: string; value: string }[];
  size?: "sm" | "md" | "lg";
  title?: string;
  titleAlign?: "left" | "center" | "right";
}

const StatsCard: FC<StatsCardProps> = ({
  data,
  size = "md",
  title,
  titleAlign = "center",
}) => {
  return (
    <div
      className={cx("text-white", {
        "text-sm": size === "sm",
        "text-base": size === "md",
        "text-lg": size === "lg",
      })}
    >
      {title && (
        <h1
          className={cx("text-white uppercase", {
            "text-lg mb-1": size === "sm",
            "text-2xl mb-2": size === "md",
            "text-3xl mb-4": size === "lg",
            "text-left": titleAlign === "left",
            "text-center": titleAlign === "center",
            "text-right": titleAlign === "right",
          })}
        >
          {title}
        </h1>
      )}
      <Card className="py-4 px-6">
        <table
          className={cx("w-full", {
            "leading-4": size === "sm",
            "leading-5": size === "md",
            "leading-6": size === "lg",
          })}
        >
          <tbody>
            {data.map((item) => (
              <tr key={item.label}>
                <td>{item.label}</td>
                <td className="text-yellow-400">{item.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default StatsCard;
