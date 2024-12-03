import { ReactNode, useState } from "react";
import Modal from "../Modal";

const links = [
  {
    title: "What is Hydra?",
    content: (
      <div className="text-center text-4xl flex flex-col gap-10 py-5">
        <h1 className="text-5xl">What is Hydra?</h1>
        <p>
          Hydra is a type of L2 scaling solution for Cardano, called a state
          channel. To learn more about Hydra, please visit the Hydra.family
          website and join the Input Output discord.
        </p>
      </div>
    ),
  },
  {
    title: "Why Doom?",
    content: (
      <div className="text-center text-4xl flex flex-col gap-10 py-5">
        <h1 className="text-5xl">Why Doom?</h1>
        <p>
          "Can it run Doom?" is both a meme and a challenge, and it’s high time
          we answer that question affirmatively for the Cardano blockchain. As
          it happens, the Doom game engine is well suited to work with Cardano
          smart contracts, and the code is fully open source.
        </p>
      </div>
    ),
  },
  {
    title: "How it works",
    content: (
      <div className="text-center text-4xl flex flex-col gap-10 py-5">
        <h1 className="text-5xl">How it works</h1>
        <p>
          When you either connect your wallet or sign in as a guest, you start a
          game session where each frame of the game - both the game state and
          your mouse+keyboard inputs - are used to create a smart contract
          transaction. This transaction is then sent to a Hydra head where the
          smart contract execution and signature is validated.
        </p>
      </div>
    ),
  },
];

const TopLinks = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<ReactNode>();

  const handleClick = (content: ReactNode) => {
    setModalContent(content);
    setIsModalOpen(true);
  };

  const close = () => {
    setIsModalOpen(false);
    setModalContent(undefined);
  };

  return (
    <div>
      <ul className="py-16 text-xl text-white font-['Pixelify_Sans'] uppercase flex gap-20 mb-20">
        {links.map(({ title, content }) => (
          <li key={title}>
            <button
              className="bg-clip-text border-b-2 border-red-500"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, #ffffff 0%, #999999 100%)",
                WebkitTextFillColor: "transparent",
              }}
              onClick={() => handleClick(content)}
            >
              {title}
            </button>
          </li>
        ))}
      </ul>
      <Modal isOpen={isModalOpen} close={close}>
        {modalContent}
      </Modal>
    </div>
  );
};

export default TopLinks;
