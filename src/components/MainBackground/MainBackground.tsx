import mainBg from "../../assets/images/main-bg.jpg";
import doomGuy from "../../assets/images/doom-guy.png";

const MainBackground = () => {
  return (
    <div className="absolute h-full w-full z-10 inset-0">
      <img
        src={mainBg}
        alt="Background"
        className="absolute object-cover object-center h-full w-full"
      />
      <div className="absolute h-1/2 w-full bottom-0">
        <img
          src={doomGuy}
          alt="Doom Guy"
          className="absolute object-cover h-full w-full object-top"
        />
        <span
          className="absolute w-full h-full"
          style={{
            background:
              "linear-gradient(180deg, rgba(255, 0, 0, 0) 40%, rgba(255, 0, 0, 0.75) 100%)",
          }}
        />
      </div>
    </div>
  );
};

export default MainBackground;
