import * as dotenv from "dotenv";
import * as contracts from "./transaction/finale-manager.js";
import { Blockfrost } from "@blaze-cardano/query";
import {
  Blaze,
  ColdWallet,
  Core,
  Data,
  HotSingleWallet,
} from "@blaze-cardano/sdk";
import minimist from "minimist";

dotenv.config();

const args =
  process.argv[0] === "npx"
    ? minimist(process.argv.slice(3))
    : minimist(process.argv.slice(2));

const usdmAssetId = process.env.USDM_ASSET_ID;
const networkId = parseInt(process.env.NETWORK_ID);
const network = networkId === 1 ? "cardano-mainnet" : "cardano-preview";

const provider = new Blockfrost({
  projectId: process.env.PROJECT_ID,
  network,
});

const wallet = new ColdWallet(
  Core.Address.fromBech32(
    "addr1v96knkqk38yt2y7fzwt84xmz6k6nq6eqf7teecvply7ukmss9yvgc",
  ),
  networkId,
  provider,
);

const [oneshotHash, oneshotIx] = args.oneShot.split("#");

const adminAddress = (await wallet.getUsedAddresses())[0];
console.error("Your address:", adminAddress.toBech32());
const adminKeyHash = adminAddress.asEnterprise().getPaymentCredential().hash;
const blaze = await Blaze.from(provider, wallet);

const contract = new contracts.PrizePrizeSpend(
  {
    VerificationKey: [adminKeyHash],
  },
  {
    transactionId: oneshotHash,
    outputIndex: BigInt(oneshotIx),
  },
);

const scriptAddress = Core.Address.fromBytes(
  Core.HexBlob("71" + contract.hash()),
);
const utxos = await blaze.provider.getUnspentOutputs(scriptAddress);
const utxo = utxos[0];
const tx = await blaze
  .newTransaction()
  .addInput(utxo, Data.void())
  .provideScript(contract)
  .addRequiredSigner(
    Core.Ed25519KeyHashHex(
      adminAddress.asEnterprise().getPaymentCredential().hash,
    ),
  )
  .complete();
console.log(tx.toCbor());
// let refereeKeyHash = adminKeyHash;
// if (args.referee) {
//   const refereeAddress = Core.Address.fromBech32(args.referee);
//   refereeKeyHash = refereeAddress.asEnterprise().getPaymentCredential().hash;
// }
// const utxos = await blaze.provider.getUnspentOutputs(adminAddress);
// console.log(utxos[0].input().transactionId(), utxos[0].input().index());
// const [txId, txIx]: [string, string] = args.input.split("#");
// const utxo = utxos.find(
//   (utxo) =>
//     utxo.input().transactionId() === txId &&
//     utxo.input().index() === BigInt(txIx),
// );

// if (!utxo) {
//   console.error("Could not resolve the OutputReference", `${txId}#${txIx}`);
//   process.exit();
// }

// const policyId = mintContract.hash();
// console.error("Your Policy ID:", policyId);

// const address = new Core.Address({
//   type: Core.AddressType.EnterpriseScript,
//   networkId: networkId,
//   paymentPart: {
//     type: Core.CredentialType.ScriptHash,
//     hash: policyId,
//   },
// });
// console.error("Script Address:", address.toBech32());
// const tx = await blaze
//   .newTransaction()
//   .addInput(utxo)
//   .addMint(
//     Core.PolicyId(policyId),
//     new Map(
//       Object.entries({ [args.tokenName]: 1n }).map(([assetName, value]) => [
//         Core.AssetName(assetName),
//         value,
//       ]),
//     ),
//     Data.void(),
//   )
//   .provideScript(mintContract)
//   .addRequiredSigner(Core.Ed25519KeyHashHex(adminKeyHash))
//   .lockAssets(
//     address,
//     new Core.Value(
//       0n,
//       new Map(
//         Object.entries({
//           [usdmAssetId]: BigInt(parseInt(args.amount) * 1000000),
//         }).map(([assetId, value]) => [Core.AssetId(assetId), value]),
//       ),
//     ),
//     Data.void(),
//   )
//   .payAssets(
//     args.outputAddress
//       ? Core.Address.fromBech32(args.outputAddress as string)
//       : adminAddress,
//     new Core.Value(
//       0n,
//       new Map(
//         Object.entries({ [policyId + args.tokenName]: 1n }).map(
//           ([assetId, value]) => [Core.AssetId(assetId), value],
//         ),
//       ),
//     ),
//   )

//   .complete();
// const signedTx = await blaze.signTransaction(tx);
// console.error("Your signed mint trasaction:", signedTx.toCbor());
// const txHash = await blaze.submitTransaction(signedTx);
// console.error("Transaction Submitted!", txHash);
// console.error("OutputReference:", `${txHash}#0`);
// console.log(txHash);
