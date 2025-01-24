import { Blaze, Core, Data, HotSingleWallet } from "@blaze-cardano/sdk";
import { PacketSchema } from "./transaction/builder.js";
import * as dotenv from "dotenv";
import { HydraProvider } from "./hydra/provider.js";
import minimist from "minimist";
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

const utxo = (await blaze.provider.getUnspentOutputs(adminAddress))[0];
const gameTx = blaze.newTransaction().addInput(utxo);

const playerOne = Core.Address.fromBech32(args.playerOne);

const playerTwo = Core.Address.fromBech32(args.playerTwo);
const playerThree = Core.Address.fromBech32(args.playerThree);
const playerFour = Core.Address.fromBech32(args.playerFour);

const getDatum = (ephemeralKey: string) =>
  Core.Datum.fromCore(
    Data.to(
      {
        to: 0n,
        from: 1n,
        ephemeralKey,
        kills: [1n, 2n, 3n, 4n],
        state: "Finished",
        data: "0000",
      },
      PacketSchema,
    ).toCore(),
  );

const outputOne = new Core.TransactionOutput(playerOne, new Core.Value(0n));
outputOne.setDatum(
  getDatum(playerOne.asEnterprise().getPaymentCredential().hash),
);

const outputTwo = new Core.TransactionOutput(playerTwo, new Core.Value(0n));
outputTwo.setDatum(
  getDatum(playerTwo.asEnterprise().getPaymentCredential().hash),
);
const outputThree = new Core.TransactionOutput(playerThree, new Core.Value(0n));
outputThree.setDatum(
  getDatum(playerThree.asEnterprise().getPaymentCredential().hash),
);
const outputFour = new Core.TransactionOutput(playerFour, new Core.Value(0n));
outputFour.setDatum(
  getDatum(playerFour.asEnterprise().getPaymentCredential().hash),
);

const tx = await gameTx
  .addOutput(outputOne)
  .addOutput(outputTwo)
  .addOutput(outputThree)
  .addOutput(outputFour)
  .complete();

const signedTx = await blaze.signTransaction(tx);
const txId = await blaze.submitTransaction(signedTx, true);
console.log("Your transaction", txId);
