import {
  Blaze,
  HotSingleWallet,
  Core,
  Data,
  Blockfrost,
} from "@blaze-cardano/sdk";
import { HydraProvider } from "./hydra/provider.js";
import { PacketSchema, TransactionBuilder } from "./transaction/builder.js";
import * as dotenv from "dotenv";
import * as contracts from "./transaction/finale-manager.js";

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

const utxos = await blaze.provider.getUnspentOutputs(adminAddress);

const mintContract = new contracts.PrizePrizeMint(
  {
    VerificationKey: [adminKeyHash],
  },
  {
    transactionId: utxos[0].input().transactionId(),
    outputIndex: utxos[0].input().index(),
  },
);
console.log(
  mintContract.asPlutusV1() !== undefined,
  mintContract.asPlutusV2() !== undefined,
  mintContract.asPlutusV3() !== undefined,
  mintContract.asNative() !== undefined,
);

const policyId = mintContract.hash();
console.log(policyId);

const firstPlace = Core.AssetName("2331");
const secondPlace = Core.AssetName("2332");
const thirdPlace = Core.AssetName("2333");
const fourthPlace = Core.AssetName("2334");

const assetMap = new Map();
assetMap.set(firstPlace, 1n);
assetMap.set(secondPlace, 1n);
assetMap.set(thirdPlace, 1n);
assetMap.set(fourthPlace, 1n);

const tokenMap = new Map();
tokenMap.set(policyId + "2331", 1n);
tokenMap.set(policyId + "2332", 1n);
tokenMap.set(policyId + "2333", 1n);
tokenMap.set(policyId + "2334", 1n);

const mintTx = await blaze
  .newTransaction()
  .addInput(utxos[0])
  .addMint(Core.PolicyId(policyId), assetMap, Data.void())
  .provideScript(mintContract)
  .addRequiredSigner(Core.Ed25519KeyHashHex(adminKeyHash))
  .payAssets(adminAddress, new Core.Value(0n, tokenMap))
  .complete();

const signedMintTx = await blaze.signTransaction(mintTx);
const mintTxId = await blaze.submitTransaction(signedMintTx, true);
console.log(mintTxId);

await new Promise((resolve) => setTimeout(resolve, 1000));

const txBuilder = new TransactionBuilder(blaze, policyId, adminKeyHash, 0);

const adminUtxos = await blaze.provider.getUnspentOutputs(adminAddress);
adminUtxos.forEach((u) => console.log(u.toCbor()));
let utxo = adminUtxos.find(
  (utxo) => utxo.output().amount().multiasset()?.size > 0,
);

const tx = await txBuilder.newSeries(utxo, [
  "b37aabd81024c043f53a069c91e51a5b52e4ea399ae17ee1fe3cb9c0",
  "b37aabd81024c043f53a069c91e51a5b52e4ea399ae17ee1fe3cb9c1",
  "b37aabd81024c043f53a069c91e51a5b52e4ea399ae17ee1fe3cb9c2",
  "b37aabd81024c043f53a069c91e51a5b52e4ea399ae17ee1fe3cb9c3",
]);

const signedTx = await blaze.signTransaction(tx);
console.log("Signed Series Start TX", signedTx.toCbor());
const txId = await blaze.submitTransaction(signedTx, true);
console.log("Series Start TX", txId);
await new Promise((resolve) => setTimeout(resolve, 1000));

await new Promise((resolve) => setTimeout(resolve, 1000));
console.log("Starting game 1 process...");
utxo = (await blaze.provider.getUnspentOutputs(adminAddress))[0];

// This is just an tx for testing purposes
const gameTx = blaze.newTransaction().addInput(utxo);

const playerOne = Core.Address.fromBytes(
  Core.HexBlob("60b37aabd81024c043f53a069c91e51a5b52e4ea399ae17ee1fe3cb9c0"),
);
const playerTwo = Core.Address.fromBytes(
  Core.HexBlob("60b37aabd81024c043f53a069c91e51a5b52e4ea399ae17ee1fe3cb9c1"),
);
const playerThree = Core.Address.fromBytes(
  Core.HexBlob("60b37aabd81024c043f53a069c91e51a5b52e4ea399ae17ee1fe3cb9c2"),
);
const playerFour = Core.Address.fromBytes(
  Core.HexBlob("60b37aabd81024c043f53a069c91e51a5b52e4ea399ae17ee1fe3cb9c3"),
);

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
  getDatum("60b37aabd81024c043f53a069c91e51a5b52e4ea399ae17ee1fe3cb9c0"),
);

const outputTwo = new Core.TransactionOutput(playerTwo, new Core.Value(0n));
outputTwo.setDatum(
  getDatum("60b37aabd81024c043f53a069c91e51a5b52e4ea399ae17ee1fe3cb9c1"),
);
const outputThree = new Core.TransactionOutput(playerThree, new Core.Value(0n));
outputThree.setDatum(
  getDatum("60b37aabd81024c043f53a069c91e51a5b52e4ea399ae17ee1fe3cb9c2"),
);
const outputFour = new Core.TransactionOutput(playerFour, new Core.Value(0n));
outputFour.setDatum(
  getDatum("60b37aabd81024c043f53a069c91e51a5b52e4ea399ae17ee1fe3cb9c3"),
);

const completeGameTx = await gameTx
  .addOutput(outputOne)
  .addOutput(outputTwo)
  .addOutput(outputThree)
  .addOutput(outputFour)
  .complete();

const signedGameTx = await blaze.signTransaction(completeGameTx);
console.log("Signed Game 1 TX", signedGameTx.toCbor());

const gameTxId = await blaze.submitTransaction(signedGameTx, true);
console.log("Game 1 TX ID", gameTxId);

await new Promise((resolve) => setTimeout(resolve, 500));
console.log("Starting series update process...");
utxo = (await blaze.provider.getUnspentOutputs(txBuilder.address))[0];
let playerOneUtxo = (await blaze.provider.getUnspentOutputs(playerOne))[0];
let playerTwoUtxo = (await blaze.provider.getUnspentOutputs(playerTwo))[0];
let playerThreeUtxo = (await blaze.provider.getUnspentOutputs(playerThree))[0];
let playerFourUtxo = (await blaze.provider.getUnspentOutputs(playerFour))[0];

let storeGameTx = await txBuilder.storeGame(
  utxo,
  [playerOneUtxo, playerTwoUtxo, playerThreeUtxo, playerFourUtxo],
  adminAddress,
);

let signedStoreGameTx = await blaze.signTransaction(storeGameTx);
// console.log("Signed Store Game TX", signedStoreGameTx.toCbor());
let storeGameTxId = await blaze.submitTransaction(signedStoreGameTx, true);
console.log("Store Game TX ID", storeGameTxId);
await new Promise((resolve) => setTimeout(resolve, 500));

utxo = (await blaze.provider.getUnspentOutputs(txBuilder.address))[0];
storeGameTx = await txBuilder.storeGame(
  utxo,
  [playerOneUtxo, playerTwoUtxo, playerThreeUtxo, playerFourUtxo],
  adminAddress,
);
signedStoreGameTx = await blaze.signTransaction(storeGameTx);
// console.log("Signed Store Game TX", signedStoreGameTx.toCbor());
storeGameTxId = await blaze.submitTransaction(signedStoreGameTx, true);
console.log("Store Game TX ID", storeGameTxId);
await new Promise((resolve) => setTimeout(resolve, 500));
utxo = (await blaze.provider.getUnspentOutputs(txBuilder.address))[0];
storeGameTx = await txBuilder.storeGame(
  utxo,
  [playerOneUtxo, playerTwoUtxo, playerThreeUtxo, playerFourUtxo],
  adminAddress,
);
signedStoreGameTx = await blaze.signTransaction(storeGameTx);
// console.log("Signed Store Game TX", signedStoreGameTx.toCbor());
storeGameTxId = await blaze.submitTransaction(signedStoreGameTx, true);
console.log("Store Game TX ID", storeGameTxId);
await new Promise((resolve) => setTimeout(resolve, 500));

utxo = (await blaze.provider.getUnspentOutputs(txBuilder.address))[0];
const distributeTx = await txBuilder.distribute(utxo, adminKeyHash);
const signedDistributeTx = await blaze.signTransaction(distributeTx);
console.log("Signed Distribute Tx", signedDistributeTx.toCbor());
const distributeTxId = await blaze.submitTransaction(signedDistributeTx, true);
console.log("Distribute Tx ID", distributeTxId);
