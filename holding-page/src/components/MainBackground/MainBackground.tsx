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
      <div
        className="absolute w-full h-full top-0 left-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(0deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,1) 100%)",
        }}
      />
    </div>
  );
};

export default MainBackground;
