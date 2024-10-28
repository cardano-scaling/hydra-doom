import hydraLogo from "../../assets/images/hydra-logo.png";
import iogLogo from "../../assets/images/iog-logo.png";
import onboardLogo from "../../assets/images/onboard-logo.png";
import popupLogo from "../../assets/images/popup-logo.png";
import sundaeLogo from "../../assets/images/sundae-labs-logo.svg";
import { CABINET_KEY } from "../../constants";

const Logos = () => {
  return (
    <div className="flex flex-wrap w-60 gap-6 justify-center items-center absolute top-16 left-14">
      <a target="_blank" href="https://hydra.family">
        <img className="w-14" src={hydraLogo} alt="Hydra" />
      </a>
      <a target="_blank" href="https://sundae.fi/">
        <img className="w-14" src={sundaeLogo} alt="Sundae Labs" />
      </a>
      <a
        target="_blank"
        className="w-14 h-14 bg-white rounded-full flex items-center justify-center"
        href="https://iog.io"
      >
        <img className="w-14" src={iogLogo} alt="IOG" />
      </a>
      {CABINET_KEY && (
        <>
          <a target="_blank" href="http://onboard.ninja">
            <img className="w-14" src={onboardLogo} alt="Onboard" />
          </a>
          <a target="_blank" href="https://x.com/PopupVirtualEnt">
            <img className="w-24" src={popupLogo} alt="Popup" />
          </a>
        </>
      )}
    </div>
  );
};

export default Logos;
