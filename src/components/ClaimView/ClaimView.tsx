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
  "c48cbb3d5e57ed56e276bc45f99ab39abe94e6cd7ac39fb402da47ad.0014df105553444d";
const PRIZES = [
  {
    userNft: `a6c92925ea63b76c3a65ab0a044b575b3ff8f6f30692c4032a1a0272.487964726120446f6f6d202d2031737420506c6163652054726f706879`,
    utxo: "92d20eb1328b26cda00eb2a1fd62bee8ac5d27c4cd9fdd34d23e2be88f81002b#0",
    one_shot:
      "8baa5f9c563ec7f3035df7d534379cbfc499e61ebf96b5c1d2a76518833c3e24#2",
    amount: new AssetAmount(25_000_000_000n, {
      decimals: 6,
      assetId: USDM_ASSET_ID,
    }),
  },
  {
    userNft: `91a2c299e2a9a3fbdc04ccbde34d1dc6a73c90b01fd7fa5a48bc5cbc.487964726120446f6f6d202d20326e6420506c6163652054726f706879`,
    utxo: "8baa5f9c563ec7f3035df7d534379cbfc499e61ebf96b5c1d2a76518833c3e24#0",
    one_shot:
      "eea388cd241f143e2ccb3727a4e28cfe9983dee93aeabfed85e595535cc54c81#2",
    amount: new AssetAmount(15_000_000_000n, {
      decimals: 6,
      assetId: USDM_ASSET_ID,
    }),
  },
  {
    userNft: `f361cc4efb23c3e94f82908289ebf5f68bb00c381a0dc85f09fbf17f.487964726120446f6f6d202d2033726420506c6163652054726f706879`,
    utxo: "eea388cd241f143e2ccb3727a4e28cfe9983dee93aeabfed85e595535cc54c81#0",
    one_shot:
      "0a1ad1024cbf5491e120d2f7ba5d247cd4dffcb6b55ad28a8de70e2cc9c8c121#2",
    amount: new AssetAmount(5_000_000_000n, {
      decimals: 6,
      assetId: USDM_ASSET_ID,
    }),
  },
  {
    userNft: `96bb6664f4d164668521ed6d44beb47d2cbf8dd2b8ecc55e7d12dd26.487964726120446f6f6d202d2034746820506c6163652054726f706879`,
    utxo: "0a1ad1024cbf5491e120d2f7ba5d247cd4dffcb6b55ad28a8de70e2cc9c8c121#0",
    one_shot:
      "b2682caf54678057a014dfee496c36558261ac1d3d0890930ee81919007cb433#0",
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
  const [extension, setExtension] = useState<string>();
  const [claimTx, setClaimTx] = useState<string | null>(
    window.localStorage.getItem(CLAIM_LOCAL_STORAGE_KEY)
  );
  const [error, setError] = useState<string>();
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

  const handleConnect = useCallback(
    (extension: string) => connectWallet(extension),
    [connectWallet],
  );

  const handleClaim = useCallback(async () => {
    if (!prizeData || !observer.api) {
      return;
    }

    const builder = await Blaze.from(
      new Blockfrost({
        network: NETWORK_ID === 1 ? "cardano-mainnet" : "cardano-preview",
        projectId: BLOCKFROST_API_KEY,
      }),
      new WebWallet(observer.api as CIP30Interface)
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
        "Could not generate a key hash from the CLAIM_ADMIN_ADDRESS env."
      );
    }

    const [oneShotId, oneShotIx] = prizeData.prize.one_shot.split("#");
    const mintContract = new contracts.PrizePrizeSpend(
      {
        VerificationKey: [adminKeyHash],
      },
      {
        transactionId: oneShotId,
        outputIndex: BigInt(oneShotIx),
      }
    );

    const totalAssets = Core.Value.fromCore(
      usdmUtxo.output().amount().toCore()
    );
    totalAssets
      .multiasset()
      ?.set(Core.AssetId(prizeData.userNft.metadata.assetId), 1n);

    try {
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
    } catch (e) {
      if (
        (e as Error)?.message ===
        "prepareCollateral: could not find enough collateral (5 ada minimum)"
      ) {
        setError(
          "Not enough ADA for collateral. Please send an additional 5 ADA to your wallet and try again."
        );
        setTimeout(() => {
          setError(undefined);
        }, 5000);
      }
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
            {!ready && extensions && (
              <>
                <p className="text-3xl mb-8 text-center max-w-[600px] mx-auto">
                  Connect your wallet to claim your prize for the Hydra Doom
                  Tournament!
                </p>
                {extensions.map((extension) => (
                  <Button
                    onClick={() => handleConnect(extension.property)}
                    className="w-96 h-16 inline-flex gap-4"
                  >
                    <img
                      className="w-6 h-6"
                      src={extension.reference.icon}
                      alt={extension.name}
                    />{" "}
                    Connect with {extension.name}
                  </Button>
                ))}
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
                      <>
                        <Button
                          onClick={handleClaim}
                          className="w-96 h-16 inline-flex gap-4"
                        >
                          Claim{" "}
                          {new Intl.NumberFormat("en-us").format(
                            prizeData.prize.amount.value.toNumber()
                          )}{" "}
                          USDM!
                        </Button>
                        {error && (
                          <p className="text-3xl mb-8 text-center max-w-[600px] mx-auto">
                            {error}
                          </p>
                        )}
                      </>
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
