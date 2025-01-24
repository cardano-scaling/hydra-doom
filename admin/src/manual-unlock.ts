import * as dotenv from "dotenv";
import * as contracts from "./transaction/finale-manager.js";
import { Blockfrost } from "@blaze-cardano/query";
import { Blaze, Core, Data, HotSingleWallet, Value } from "@blaze-cardano/sdk";
import minimist from "minimist";
import { HydraProvider } from "./hydra/provider.js";
import { TransactionBuilder } from "./transaction/builder.js";

dotenv.config();

const args =
  process.argv[0] === "npx"
    ? minimist(process.argv.slice(3))
    : minimist(process.argv.slice(2));
const networkId = parseInt(process.env.NETWORK_ID);
const network = networkId === 1 ? "cardano-mainnet" : "cardano-preview";

const provider = new HydraProvider(process.env.URL, networkId);

const wallet = new HotSingleWallet(
  Core.Ed25519PrivateNormalKeyHex(process.env.PRIVATE_KEY),
  networkId,
  provider,
);

const adminAddress = (await wallet.getUsedAddresses())[0];
console.log("Your address:", adminAddress.toBech32());
const adminKeyHash = adminAddress.asEnterprise().getPaymentCredential().hash;

const blaze = await Blaze.from(provider, wallet);
const txBuilder = new TransactionBuilder(blaze, adminKeyHash, networkId);

const utxo = (await blaze.provider.getUnspentOutputs(txBuilder.address))[0];
const datum = Core.PlutusData.fromCore(
  utxo.output().datum().asInlineData().toCore(),
);
const seriesState = Data.from(datum, contracts.FinaleManagerSpend.datum);
const redeemer = Data.to("Distribute", contracts.FinaleManagerSpend.redeemer);

const addresses = [
  args.firstPlace,
  args.secondPlace,
  args.thirdPlace,
  args.fourthPlace,
];

// 020b4c53acc2b900a6ae489bdcc9e4fbe26df9dfcc21610e4b5ffaa42334
// a56a4703fee9a7b5cd653f1415bd379c8eb85c608d69ace3ec57f9c32335
// ad07905a16f8f8f015de33373a5c481298ff9831fa6e5451e5293fc72336
// 63d2e793afebc66d9ae553904a8ab3b4bffba45d9b4136d45a577b052337
const tx = blaze
  .newTransaction()
  .addInput(utxo, redeemer)
  .provideScript(txBuilder.contract)
  .addRequiredSigner(Core.Ed25519KeyHashHex(adminKeyHash));

const assets = utxo.output().amount().multiasset()!;
seriesState.policies.forEach((policyId: string, i) => {
  const asset = Array.from(assets.keys()).find((assetId) =>
    assetId.startsWith(policyId),
  );

  const assetId = Core.AssetId(asset);
  const value = new Core.Value(5_000_000n, new Map([[assetId, 1n]]));
  tx.payAssets(Core.Address.fromBech32(addresses[i]), value);
});

const completeTx = await tx.complete();
const signedTx = await blaze.signTransaction(completeTx);
console.log("Signed  Tx", signedTx.toCbor());
const txId = await blaze.submitTransaction(signedTx, true);
console.log("Distribute Tx ID", txId);
