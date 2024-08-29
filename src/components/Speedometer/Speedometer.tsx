import speedometer from "../../assets/images/speedometer.png";
import speedometerTick from "../../assets/images/speedometer-tick.png";

const Speedometer = () => {
  return (
    <div className="w-max text-white">
      <div className="relative mb-3">
        <div className="absolute -bottom-1 left-9">0</div>
        <img src={speedometer} alt="Speedometer" className="w-72" />
        <img
          alt="Speedometer tick"
          className="absolute w-28 bottom-0 left-14"
          src={speedometerTick}
        />
        <div className="absolute -bottom-1 right-9">3000</div>
      </div>
      <div className="text-center">0</div>
    </div>
  );
};

export default Speedometer;
