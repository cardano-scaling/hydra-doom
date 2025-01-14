import { Blaze, HotSingleWallet, Core } from "@blaze-cardano/sdk";
import { HydraProvider } from "./hydra/provider.js";
import { TransactionBuilder } from "./transaction/builder.js";
import * as dotenv from "dotenv";

dotenv.config();

const hydraProvider = new HydraProvider(process.env.URL, 0);
const wallet = new HotSingleWallet(
  Core.Ed25519PrivateNormalKeyHex(process.env.PRIVATE_KEY),
  0,
  hydraProvider,
);

const adminAddress = (await wallet.getUsedAddresses())[0];
const adminKeyHash = adminAddress.asEnterprise().getPaymentCredential().hash;

const blaze = await Blaze.from(hydraProvider, wallet);

const txBuilder = new TransactionBuilder(
  blaze,
  process.env.POLICY_ID,
  adminKeyHash,
  0,
);

const utxos = await blaze.provider.getUnspentOutputs(
  Core.Address.fromBech32(
    "addr_test1vp5cxztpc6hep9ds7fjgmle3l225tk8ske3rmwr9adu0m6qchmx5z",
  ),
);
console.log(utxos);
const utxo = (await blaze.provider.getUnspentOutputs(adminAddress))[0];
const tx = await txBuilder.newSeries(utxo, [
  "b37aabd81024c043f53a069c91e51a5b52e4ea399ae17ee1fe3cb9c44db707eb",
  "b37aabd81024c043f53a069c91e51a5b52e4ea399ae17ee1fe3cb9c44db707eb",
  "b37aabd81024c043f53a069c91e51a5b52e4ea399ae17ee1fe3cb9c44db707eb",
  "b37aabd81024c043f53a069c91e51a5b52e4ea399ae17ee1fe3cb9c44db707eb",
]);

console.log("Transaction", tx.toCbor());
const signedTx = await blaze.signTransaction(tx);
console.log("signed tx", signedTx.toCbor());
signedTx;
const txId = await blaze.provider.postTransactionToChain(signedTx);
console.log("Tranasction ID", txId);
