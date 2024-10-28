import Button from "../Button";

const RestartButton = () => {
  const handleButtonClick = () => {
    window.location.reload();
  };

  return (
    <div className="absolute top-16 right-14">
      <Button tick className="text-xl w-36 h-11" onClick={handleButtonClick}>
        Restart
      </Button>
    </div>
  );
};

export default RestartButton;
