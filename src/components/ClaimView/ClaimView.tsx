import { FC, useCallback, useMemo, useState } from "react";
import { withClaimWrapper } from "./withClaimWrapper";
import {
  useWalletObserver,
  useAvailableExtensions,
  useWalletLoadingState,
} from "@sundaeswap/wallet-lite";
import { AssetAmount } from "@sundaeswap/asset";
import {
  Blaze,
  Blockfrost,
  CIP30Interface,
  Core,
  Data,
  WebWallet,
} from "@blaze-cardano/sdk";

import * as contracts from "../../../admin/src/transaction/finale-manager";
import Button from "../Button";
import {
  BLOCKFROST_API_KEY,
  CLAIM_ADMIN_ADDRESS,
  NETWORK_ID,
} from "../../constants";

const CLAIM_LOCAL_STORAGE_KEY = "HYRDA_DOOM_CLAIMED";
const USDM_ASSET_ID =
  "d8906ca5c7ba124a0407a32dab37b2c82b13b3dcd9111e42940dcea4.0014df105553444d";
const PRIZES = [
  {
    userNft: `503aa923622f9de3fc524ac253fbbe93578d48a48acfdb49548c8620.487964726120446f6f6d2031737420506c616365`,
    utxo: "2e976d6810b84fca603864bccd98c0de5a25072ef79e51fd432260221bca8323#0",
    one_shot:
      "510256a0aa0669137301bea89daed8b619e07aad3388708024805234156ca329#0",
    amount: new AssetAmount(25_000_000_000n, {
      decimals: 6,
      assetId: USDM_ASSET_ID,
    }),
  },
  {
    userNft: `503aa923622f9de3fc524ac253fbbe93578d48a48acfdb49548c8620.487964726120446f6f6d20326e6420506c616365`,
    utxo: "2e976d6810b84fca603864bccd98c0de5a25072ef79e51fd432260221bca8323#1",
    one_shot:
      "510256a0aa0669137301bea89daed8b619e07aad3388708024805234156ca329#1",
    amount: new AssetAmount(15_000_000_000n, {
      decimals: 6,
      assetId: USDM_ASSET_ID,
    }),
  },
  {
    userNft: `503aa923622f9de3fc524ac253fbbe93578d48a48acfdb49548c8620.487964726120446f6f6d2033726420506c616365`,
    utxo: "2e976d6810b84fca603864bccd98c0de5a25072ef79e51fd432260221bca8323#2",
    one_shot:
      "510256a0aa0669137301bea89daed8b619e07aad3388708024805234156ca329#2",
    amount: new AssetAmount(5_000_000_000n, {
      decimals: 6,
      assetId: USDM_ASSET_ID,
    }),
  },
  {
    userNft: `503aa923622f9de3fc524ac253fbbe93578d48a48acfdb49548c8620.487964726120446f6f6d2034746820506c616365`,
    utxo: "2e976d6810b84fca603864bccd98c0de5a25072ef79e51fd432260221bca8323#3",
    one_shot:
      "510256a0aa0669137301bea89daed8b619e07aad3388708024805234156ca329#3",
    amount: new AssetAmount(5_000_000_000n, {
      decimals: 6,
      assetId: USDM_ASSET_ID,
    }),
  },
];

export const ClaimView: FC = withClaimWrapper(() => {
  const { disconnect, connectWallet, balance, mainAddress, observer } =
    useWalletObserver();
  const { ready, connectingWallet } = useWalletLoadingState();
  const extensions = useAvailableExtensions();
  const extension = extensions.find((e) => e.name === "Lace");
  const [claimTx, setClaimTx] = useState<string | null>(
    window.localStorage.getItem(CLAIM_LOCAL_STORAGE_KEY),
  );
  const prizeData = useMemo(() => {
    for (const prize of PRIZES) {
      const userNft = balance.get(prize.userNft);
      if (userNft) {
        return {
          userNft,
          prize,
        };
      }
    }

    return undefined;
  }, [balance]);

  const handleConnect = useCallback(async () => {
    await connectWallet("lace");
  }, [connectWallet]);

  const handleClaim = useCallback(async () => {
    if (!prizeData || !observer.api) {
      return;
    }

    const builder = await Blaze.from(
      new Blockfrost({
        network: NETWORK_ID === 1 ? "cardano-mainnet" : "cardano-preview",
        projectId: BLOCKFROST_API_KEY,
      }),
      new WebWallet(observer.api as CIP30Interface),
    );

    const [usdmUtxo] = await builder.provider.resolveUnspentOutputs([
      Core.TransactionInput.fromCore({
        index: Number(prizeData.prize.utxo.split("#")[1]),
        txId: Core.TransactionId(prizeData.prize.utxo.split("#")[0]),
      }),
    ]);

    const adminAddress = Core.Address.fromBech32(CLAIM_ADMIN_ADDRESS);
    const adminKeyHash = adminAddress
      .asEnterprise()
      ?.getPaymentCredential().hash;

    if (!adminKeyHash) {
      throw new Error(
        "Could not generate a key hash from the CLAIM_ADMIN_ADDRESS env.",
      );
    }

    const [oneShotId, oneShotIx] = prizeData.prize.one_shot.split("#");
    const mintContract = new contracts.PrizePrizeMint(
      {
        VerificationKey: [adminKeyHash],
      },
      {
        transactionId: oneShotId,
        outputIndex: BigInt(oneShotIx),
      },
    );

    const totalAssets = Core.Value.fromCore(
      usdmUtxo.output().amount().toCore(),
    );
    totalAssets
      .multiasset()
      ?.set(Core.AssetId(prizeData.userNft.metadata.assetId), 1n);

    const tx = await builder
      .newTransaction()
      .addInput(usdmUtxo, Data.void())
      .provideScript(mintContract)
      .payAssets(Core.Address.fromBech32(mainAddress), totalAssets)
      .complete();

    const signedTx = await builder.signTransaction(tx);
    const txHash = await builder.submitTransaction(signedTx);
    if (txHash) {
      setClaimTx(txHash);
      localStorage.setItem(CLAIM_LOCAL_STORAGE_KEY, txHash);
    }
  }, [prizeData, observer.api, mainAddress]);

  return (
    <div className="w-full max-w-5xl">
      <h1 className="text-black text-center font-['Pixelify_Sans'] text-7xl font-bold mb-2">
        Claim Your Prize
      </h1>
      {connectingWallet ? (
        <p className="text-3xl mb-8 text-center max-w-[600px] mx-auto">
          Connecting...
        </p>
      ) : (
        <>
          <div className="flex flex-col items-center justify-center gap-2">
            {!ready && extension && (
              <>
                <p className="text-3xl mb-8 text-center max-w-[600px] mx-auto">
                  Connect your wallet to claim your prize for the Hydra Doom
                  Tournament!
                </p>
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
              </>
            )}
            {ready && (
              <>
                {!prizeData ? (
                  <p className="text-3xl mb-8">
                    You do not have a reward NFT in your wallet, sorry!
                  </p>
                ) : (
                  <>
                    <p className="text-3xl mb-8 text-center max-w-[600px] mx-auto">
                      Congratulations, you're a winner!
                    </p>
                    {claimTx ? (
                      <p className="text-3xl mb-8 text-center max-w-[600px] mx-auto">
                        You've already claimed this reward. Here's the
                        transaction ID:{" "}
                        <span className="text-lg">{claimTx}</span>
                      </p>
                    ) : (
                      <Button
                        onClick={handleClaim}
                        className="w-96 h-16 inline-flex gap-4"
                      >
                        Claim{" "}
                        {new Intl.NumberFormat("en-us").format(
                          prizeData.prize.amount.value.toNumber(),
                        )}{" "}
                        USDM!
                      </Button>
                    )}
                  </>
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
        </>
      )}
    </div>
  );
});
