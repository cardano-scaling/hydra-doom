import { useState } from "react";
import MainBackground from "./components/MainBackground";
import Modal from "./components/Modal";

export default function App() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <main className="relative min-h-screen">
      <div className="z-20 relative">
        Lorem ipsum dolor sit amet consectetur, adipisicing elit. Illum repellat
        velit omnis qui quidem odit quis ad nostrum eum quibusdam voluptas,
        ducimus nesciunt non ipsum dolor unde magnam facilis incidunt!
      </div>

      <Modal isOpen={isOpen} close={() => setIsOpen(false)}>
        <div className="text-center text-4xl flex flex-col gap-8">
          <h1 className="text-5xl">Welcome to Hydra Doom</h1>
          <p>
            Hydra Doom is a technology demonstration showcasing one of Cardano’s
            scaling solutions called Hydra using the shareware levels of the
            1993 id software game Doom.
          </p>
          <p>
            While you are playing, the game states will be streamed into a Hydra
            head, which uses Cardano smart contracts to validate the game
            transition for every frame, in real time. It’s a passion project put
            together by a small team, including Sundae Labs, Adam Dean, and a
            few folks from IOG, in a short amount of time. All the code is fully
            open sourced.
          </p>
          <p>
            Hydra Doom is intended as a light-hearted tech demo and is not a
            commercial product.
          </p>
        </div>
      </Modal>
      <MainBackground />
    </main>
  );
}
