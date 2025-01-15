import { useState, lazy, useMemo } from "react";
import InitialView from "./components/InitialView";
import GameView from "./components/GameView";
import AppContextProvider from "./context/AppContextProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const LazyClaimView = lazy(() => import("./components/ClaimView"));

const queryClient = new QueryClient();

export default function App() {
  const pathSegments = window.location.hash.split("/").filter(Boolean);
  const url = pathSegments?.[1];
  const [isGameStarted, setIsGameStarted] = useState(false);

  const normalView = useMemo(
    () => (
      <AppContextProvider>
        {isGameStarted ? (
          <GameView />
        ) : (
          <InitialView
            startGame={() => {
              setIsGameStarted(true);
              window.history.replaceState({}, document.title, "/");
            }}
          />
        )}
      </AppContextProvider>
    ),
    [isGameStarted],
  );

  return (
    <QueryClientProvider client={queryClient}>
      {url === "claim-reward" ? <LazyClaimView /> : normalView}
    </QueryClientProvider>
  );
}
