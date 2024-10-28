import { FC, ReactNode } from "react";
import cx from "classnames";

interface CardProps {
  children: ReactNode;
  className?: string;
  glass?: boolean;
}

const Card: FC<CardProps> = ({ children, className, glass }) => {
  return (
    <div
      className={cx(
        "border border-red-600 shadow-xl",
        {
          "bg-stone-900": !glass,
          "bg-stone-800 bg-opacity-50 backdrop-blur-sm": glass,
        },
        className,
      )}
    >
      {children}
    </div>
  );
};

export default Card;
