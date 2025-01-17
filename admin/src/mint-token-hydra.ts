import * as dotenv from "dotenv";
import * as contracts from "./transaction/finale-manager.js";
import { Blockfrost } from "@blaze-cardano/query";
import { Blaze, Core, Data, HotSingleWallet } from "@blaze-cardano/sdk";
import minimist from "minimist";
import { HydraProvider } from "./hydra/provider.js";

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
const utxos = await blaze.provider.getUnspentOutputs(adminAddress);
const utxo = utxos[0];

const mintContract = new contracts.PrizePrizeMint(
  {
    VerificationKey: [adminKeyHash],
  },
  {
    transactionId: utxo.input().transactionId(),
    outputIndex: utxo.input().index(),
  },
);

const policyId = mintContract.hash();
console.log("Your Policy ID:", policyId);

const address = new Core.Address({
  type: Core.AddressType.EnterpriseScript,
  networkId: networkId,
  paymentPart: {
    type: Core.CredentialType.ScriptHash,
    hash: policyId,
  },
});
console.log("Script Address:", address.toBech32());
const tx = await blaze
  .newTransaction()
  .addInput(utxo)
  .addMint(
    Core.PolicyId(policyId),
    new Map(
      Object.entries({ [args.tokenName]: 1n }).map(([assetName, value]) => [
        Core.AssetName(assetName),
        value,
      ]),
    ),
    Data.void(),
  )
  .provideScript(mintContract)
  .addRequiredSigner(Core.Ed25519KeyHashHex(adminKeyHash))
  .payAssets(
    adminAddress,
    new Core.Value(
      0n,
      new Map(
        Object.entries({ [policyId + args.tokenName]: 1n }).map(
          ([assetId, value]) => [Core.AssetId(assetId), value],
        ),
      ),
    ),
  )

  .complete();
const signedTx = await blaze.signTransaction(tx);
console.log("Your signed mint trasaction:", signedTx.toCbor());
const txHash = await blaze.submitTransaction(signedTx);
console.log("Transaction Submitted!", txHash);
console.log("OutputReference:", `${txHash}#0`);
