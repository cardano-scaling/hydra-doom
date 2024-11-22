import MainBackground from "./components/MainBackground";
import hydraLogo from "./assets/images/hydra-logo.png";
import hydraText from "./assets/images/hydra-text.png";
import HubspotForm from "./components/HubspotForm";

function App() {
  return (
    <main className="relative min-h-screen">
      <div className="z-20 relative flex flex-col items-center p-10">
        <a
          target="_blank"
          href="https://hydra.family"
          className="absolute top-16 left-14"
        >
          <img className="w-14" src={hydraLogo} alt="Hydra" />
        </a>
        <img
          src={hydraText}
          alt="Hydra"
          className="w-full max-w-2xl relative -bottom-12 -mt-12 z-10 pointer-events-none"
        />
        <div
          className="text-yellow-400 text-6xl mt-16 font-[VT323] mb-14"
          style={{
            textShadow:
              "0 0 10px #db1102, 0 0 20px #f2581f, 0 0 50px #f2581f, 0 0 50px rgba(255, 5, 5, 0.25)",
          }}
        >
          HYDRA<sup className="font-sans">®</sup> DOOM TOURNAMENT
        </div>
        <div className="flex flex-col gap-6 text-white max-w-2xl text-2xl text-center mb-12">
          <p>
            After the initial success of the Hydra Doom demo at Rare Evo 2024,
            we’re raising hell once again, only this time it’s bigger and badder
            than ever before.
          </p>
          <p>Coming soon ... !</p>
          <p>
            To get information and updates regarding the Hydra Doom Tournament,
            enter your email below.
          </p>
          <p>
            To learn more about how Hydra works visit{" "}
            <a
              href="https://hydra.family/head-protocol/"
              target="_blank"
              className="text-yellow-400 underline"
            >
              hydra.family
            </a>
            .
          </p>
        </div>
        <HubspotForm />
      </div>
      <MainBackground />
    </main>
  );
}

export default App;
