import { Blaze, Core, HotSingleWallet } from "@blaze-cardano/sdk";
import minimist from "minimist";
import * as dotenv from "dotenv";
import { HydraProvider } from "./hydra/provider.js";
import { TransactionBuilder } from "./transaction/builder.js";

dotenv.config();

const args =
  process.argv[0] === "npx"
    ? minimist(process.argv.slice(3))
    : minimist(process.argv.slice(2));

const networkId = parseInt(process.env.NETWORK_ID);

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
const distributeTx = await txBuilder.distribute(utxo, adminKeyHash);
const signedDistributeTx = await blaze.signTransaction(distributeTx);
console.log("Signed Distribute Tx", signedDistributeTx.toCbor());
const distributeTxId = await blaze.submitTransaction(signedDistributeTx, true);
console.log("Distribute Tx ID", distributeTxId);
