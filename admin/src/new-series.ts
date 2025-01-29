import { Blaze, ColdWallet, Core, HotSingleWallet } from "@blaze-cardano/sdk";
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

const wallet = new ColdWallet(
  Core.Address.fromBech32(
    "addr_test1qqzg3kmc2j27vu4uanz0fg7xpegjnf8zt47ldwgnexldc8fedfm56v6yzpt8n0ngw6zjtde2luq63pgkkc89mawce4gsfdhqlq",
  ),
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

const firstPlace: string = args.firstPlace;
const secondPlace: string = args.secondPlace;
const thirdPlace: string = args.thirdPlace;
const fourthPlace: string = args.fourthPlace;

const firstPlaceDistribute: string = args.firstPlacePkh;
const secondPlaceDistribute: string = args.secondPlacePkh;
const thirdPlaceDistribute: string = args.thirdPlacePkh;
const fourthPlaceDistribute: string = args.fourthPlacePkh;

const txBuilder = new TransactionBuilder(blaze, adminKeyHash, networkId);

const utxos = await blaze.provider.getUnspentOutputs(adminAddress);
const tokenUtxos = utxos.filter(
  (utxo) => !!utxo.output().amount().multiasset(),
);

const tx = await txBuilder.newSeries(
  tokenUtxos,
  addresses.map(
    (address) => address.asEnterprise().getPaymentCredential().hash,
  ),
  [
    firstPlace.substring(0, 56),
    secondPlace.substring(0, 56),
    thirdPlace.substring(0, 56),
    fourthPlace.substring(0, 56),
  ],
  [
    firstPlaceDistribute,
    secondPlaceDistribute,
    thirdPlaceDistribute,
    fourthPlaceDistribute,
  ],
);

const signedTx = await blaze.signTransaction(tx);
console.log("Your new series tx:", tx.toCbor());
const txId = await blaze.submitTransaction(signedTx, true);
console.log("Transaction ID:", txId);
console.log("Hitting control plane to update state...");
try {
  await fetch(`http://localhost:8000/game/new_series?utxo=${txId}%230`);
  console.log("Series ready to go!");
} catch (e) {
  console.error(
    "Failed to update state, URL:",
    `http://localhost:8000/game/new_series?utxo=${txId}%230`,
    e,
  );
}
