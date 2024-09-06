import Card from "../Card";
import Speedometer from "../Speedometer";

const GlobalTPS = () => {
  return (
    <Card glass className="py-4 px-6 flex flex-col items-center">
      <h1 className="mb-4 text-white text-2xl uppercase text-center">
        Global TPS
      </h1>
      <Speedometer />
    </Card>
  );
};

export default GlobalTPS;
