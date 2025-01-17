import * as dotenv from "dotenv";
import * as contracts from "./transaction/finale-manager.js";
import { Blockfrost } from "@blaze-cardano/query";
import { Blaze, Core, Data, HotSingleWallet, Value } from "@blaze-cardano/sdk";
import minimist from "minimist";

dotenv.config();

const args =
  process.argv[0] === "npx"
    ? minimist(process.argv.slice(3))
    : minimist(process.argv.slice(2));
const networkId = parseInt(process.env.NETWORK_ID);
const network = networkId === 1 ? "cardano-mainnet" : "cardano-preview";

const provider = new Blockfrost({
  projectId: process.env.PROJECT_ID,
  network,
});

const wallet = new HotSingleWallet(
  Core.Ed25519PrivateNormalKeyHex(process.env.PRIVATE_KEY),
  networkId,
  provider,
);

const adminAddress = (await wallet.getUsedAddresses())[0];
console.log("Your address:", adminAddress.toBech32());
const adminKeyHash = adminAddress.asEnterprise().getPaymentCredential().hash;

const [oneShotId, oneShotIx]: [string, string] = args.oneShot.split("#");
const mintContract = new contracts.PrizePrizeMint(
  {
    VerificationKey: [adminKeyHash],
  },
  {
    transactionId: oneShotId,
    outputIndex: BigInt(oneShotIx),
  },
);

const policyId = mintContract.hash();
const scriptAddress = new Core.Address({
  type: Core.AddressType.EnterpriseScript,
  networkId: networkId,
  paymentPart: {
    type: Core.CredentialType.ScriptHash,
    hash: policyId,
  },
});

const blaze = await Blaze.from(provider, wallet);
const [tokenTxId, tokenTxIx]: [string, string] = args.tokenUtxo.split("#");
const adminUtxos = await blaze.provider.getUnspentOutputs(adminAddress);
const adminUtxo = adminUtxos.find(
  (utxo) =>
    utxo.input().transactionId() === tokenTxId &&
    utxo.input().index() === BigInt(tokenTxIx),
);
const utxos = await blaze.provider.getUnspentOutputs(scriptAddress);
const [txId, txIx]: [string, string] = args.input.split("#");
const utxo = utxos.find(
  (utxo) =>
    utxo.input().transactionId() === txId &&
    utxo.input().index() === BigInt(txIx),
);

if (!adminUtxo) {
  console.error(
    "Could not resolve the OutputReference",
    `${tokenTxId}#${tokenTxIx}`,
  );
  process.exit();
}

if (!utxo) {
  console.error("Could not resolve the OutputReference", `${txId}#${txIx}`);
  process.exit();
}

console.log("Script Address:", scriptAddress.toBech32());
const tx = await blaze
  .newTransaction()
  .addInput(adminUtxo)
  .addInput(utxo, Data.void())
  .provideScript(mintContract)
  .payAssets(
    adminAddress,
    new Core.Value(0n, utxo.output().amount().multiasset()),
  )
  .complete();

const signedTx = await blaze.signTransaction(tx);
console.log("Your signed tx:", signedTx.toCbor());
const txHash = await blaze.submitTransaction(signedTx);
console.log("Your Tx ID", txHash);
