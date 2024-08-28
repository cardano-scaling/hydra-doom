import { ButtonHTMLAttributes, FC } from "react";
import buttonBg from "../../assets/images/button-bg.png";
import buttonBgTick from "../../assets/images/button-bg-tick.png";
import buttonBgDecoration from "../../assets/images/button-bg-decoration.png";
import cx from "classnames";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tick?: boolean;
  withDecoration?: boolean;
}

const Button: FC<ButtonProps> = ({ children, className, tick, ...props }) => {
  return (
    <div className="relative">
      <div
        className="absolute -inset-[86px] bg-center bg-no-repeat bg-contain pointer-events-none"
        style={{ backgroundImage: `url(${buttonBgDecoration})` }}
      />
      <button
        {...props}
        className={cx(
          "text-yellow-400 font-['Pixelify_Sans'] bg-cover bg-center bg-no-repeat flex justify-center items-center shadow-lg",
          "text-shadow-custom hover:scale-[1.017] hover:shadow-xl transition-all duration-300 uppercase text-3xl",
          className,
        )}
        style={{ backgroundImage: `url(${tick ? buttonBgTick : buttonBg})` }}
      >
        {children}
      </button>
    </div>
  );
};

export default Button;
