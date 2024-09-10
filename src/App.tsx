import { useState } from "react";
import InitialView from "./components/InitialView";
import GameView from "./components/GameView";
import AppContextProvider from "./context/AppContextProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import GameContextProvider from "./context/GameContextProvider";

const queryClient = new QueryClient();

export default function App() {
  const [isGameStarted, setIsGameStarted] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <AppContextProvider>
        {isGameStarted ? (
          <GameContextProvider>
            <GameView />
          </GameContextProvider>
        ) : (
          <InitialView startGame={() => setIsGameStarted(true)} />
        )}
      </AppContextProvider>
    </QueryClientProvider>
  );
}
