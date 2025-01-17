import { FC, useCallback, useMemo } from "react";
import { withClaimWrapper } from "./withClaimWrapper";
import {
  useWalletObserver,
  useAvailableExtensions,
  useWalletLoadingState,
} from "@sundaeswap/wallet-lite";
import { AssetAmount } from "@sundaeswap/asset";
import { Blaze, Blockfrost } from "@blaze-cardano/sdk";

import Button from "../Button";

export const ClaimView: FC = withClaimWrapper(() => {
  const { disconnect, connectWallet, balance } = useWalletObserver();
  const { ready } = useWalletLoadingState();
  const extensions = useAvailableExtensions();
  const extension = extensions.find((e) => e.name === "Lace");
  const prizeData = useMemo(() => {
    const nft1 = balance.get("nft1");
    if (nft1) {
      return {
        userNft: nft1,
        prize: new AssetAmount(10_000_000n, { decimals: 6, assetId: "" }),
      };
    }

    const nft2 = balance.get("nft2");
    if (nft2) {
      return {
        userNft: nft2,
        prize: new AssetAmount(15_000_000n, { decimals: 6, assetId: "" }),
      };
    }

    const nft3 = balance.get("nft3");
    if (true) {
      return {
        userNft: nft3,
        prize: new AssetAmount(30_000_000n, { decimals: 6, assetId: "" }),
      };
    }

    const nft4 = balance.get("nft4");
    if (nft4) {
      return {
        userNft: nft4,
        prize: new AssetAmount(50_000_000n, { decimals: 6, assetId: "" }),
      };
    }

    return undefined;
  }, [balance]);

  const handleConnect = useCallback(async () => {
    await connectWallet("lace");
  }, [connectWallet]);

  return (
    <div className="w-full max-w-5xl">
      <h1 className="text-black text-center font-['Pixelify_Sans'] text-7xl font-bold mb-8">
        Claim Your Prize!
      </h1>
      <div className="flex flex-col items-center justify-center gap-2">
        {!ready && extension && (
          <Button
            onClick={handleConnect}
            className="w-96 h-16 inline-flex gap-4"
          >
            <img
              className="w-6 h-6"
              src={extension.reference.icon}
              alt={extension.name}
            />{" "}
            Connect with {extension.name}
          </Button>
        )}
        {ready && (
          <>
            {!prizeData ? (
              <p>You do not have a reward NFT in your wallet, sorry!</p>
            ) : (
              <Button
                onClick={disconnect}
                className="w-96 h-16 inline-flex gap-4"
              >
                Claim {prizeData.prize.value.toNumber()} USDM!
              </Button>
            )}
            <Button
              onClick={disconnect}
              className="w-96 h-16 inline-flex gap-4"
            >
              Disconnect Wallet
            </Button>
          </>
        )}
      </div>
    </div>
  );
});
