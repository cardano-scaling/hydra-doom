import { FC, useCallback } from "react";
import { withClaimWrapper } from "./withClaimWrapper";
import {
  useWalletObserver,
  useAvailableExtensions,
  useWalletLoadingState,
} from "@sundaeswap/wallet-lite";

export const ClaimView: FC = withClaimWrapper(() => {
  const { activeWallet, disconnect, connectWallet } = useWalletObserver();
  const { connectingWallet, ready } = useWalletLoadingState();
  const extensions = useAvailableExtensions();

  const handleConnect = useCallback(
    async (wallet: string) => {
      if (!wallet) {
        return;
      }

      await connectWallet(wallet);
    },
    [connectWallet],
  );

  return (
    <div className="grid grid-cols-2 gap-52 w-full max-w-5xl">
      <select
        value={activeWallet}
        onChange={(e) => handleConnect(e.target.value)}
      >
        <option value={undefined}>
          {connectingWallet ? "Connecting..." : "Select a wallet..."}
        </option>
        {extensions.map((e) => (
          <option key={e.name} value={e.property}>
            {e.name}
          </option>
        ))}
      </select>
      {<p>{activeWallet}</p>}
      {ready && <button onClick={() => disconnect()}>Disconnect</button>}
    </div>
  );
});
