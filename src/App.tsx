import { useState } from "react";
import InitialView from "./components/InitialView";
import GameView from "./components/GameView";

export default function App() {
  const [isGameStarted, setIsGameStarted] = useState(false);

  if (isGameStarted) return <GameView />;

  return <InitialView startGame={() => setIsGameStarted(true)} />;
}
