import { FC } from "react";
import { WalletObserverProvider } from "@sundaeswap/wallet-lite";

import MainBackground from "../MainBackground";
import Logos from "../Logos";

export const withClaimWrapper = (Component: FC) => () => {
  return (
    <WalletObserverProvider
      options={{
        refreshInterval: 1000,
        observerOptions: {
          persistence: true,
        },
      }}
    >
      <main className="relative min-h-screen pb-8">
        <div className="z-20 relative min-h-screen flex items-center justify-center">
          <Logos />
          <Component />
        </div>
        <MainBackground />
      </main>
    </WalletObserverProvider>
  );
};
