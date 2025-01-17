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

const addresses = [
  Core.Address.fromBech32(args.playerOne),
  Core.Address.fromBech32(args.playerTwo),
  Core.Address.fromBech32(args.playerThree),
  Core.Address.fromBech32(args.playerFour),
];

const gameUtxos = [];
for (const address of addresses) {
  gameUtxos.push((await blaze.provider.getUnspentOutputs(address))[0]);
}

const txBuilder = new TransactionBuilder(blaze, adminKeyHash, networkId);

const utxos = await blaze.provider.getUnspentOutputs(txBuilder.address);
const utxo = utxos[0];
const tx = await txBuilder.storeGame(utxo, gameUtxos, adminAddress);

const signedTx = await blaze.signTransaction(tx);
console.log("Your new series tx:", signedTx.toCbor());
const txId = await blaze.submitTransaction(signedTx, true);
console.log("Transaction ID:", txId);
