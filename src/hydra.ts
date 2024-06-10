import {
  C,
  Data,
  Lucid,
  UTxO,
  valueToAssets,
  toHex,
  Constr,
  TxSigned,
} from "lucid-cardano";

import { HydraProvider } from "./lucid-provider-hydra";
import {
  GameData,
  Player,
  buildDatum,
  initialGameData,
} from "./contract/datum";
import { CBOR } from "./contract/cbor";
import { UTxOResponse, recordValueToAssets } from "./types";

// Setup a lucid instance running against hydra

console.log("Setting up a lucid instance against hydra");
const lucid = await Lucid.new(
  new HydraProvider("http://3.15.33.186:4001"),
  "Preprod",
);
console.log(lucid);

// Private key of the wallet used in hydra devnet:
//
// Using a cardano-cli envelope file with a PaymentSigningKeyShelley_ed25519 type:
// cat /tmp/hydra-cluster-Nothing-2bf845ef1b4b44aa/wallet.sk | jq -r .cborHex | cut -c 5- | bech32 ed25519_sk
const privateKey =
  process.env.SIGNING_KEY ||
  "ed25519_sk1l3r62rzyrk7le5pyplyysthagqkm4wgwks86rfvzwl67vg0ectuqqvv9kw";
lucid.selectWalletFromPrivateKey(privateKey);

console.info(
  "Using ad-hoc wallet",
  privateKey,
  "with address: ",
  await lucid.wallet.address(),
);
const address = await lucid.wallet.address();
const pkh = lucid.utils.getAddressDetails(address).paymentCredential?.hash;
const scriptAddress = lucid.utils.validatorToAddress({
  script: CBOR,
  type: "PlutusV2",
});

// Makeshift hydra client

console.log("connecting to hydra head at ws://3.15.33.186:4001");

const protocol = window.location.protocol == "https:" ? "wss:" : "ws:";
const conn = new WebSocket(protocol + "//3.15.33.186:4001?history=no");

async function getUTxO() {
  const res = await fetch("http://3.15.33.186:4001/snapshot/utxo");
  return res.json();
}

// Game initialization
let gameData: GameData = initialGameData(pkh!);
const scriptRef = await createScriptRef();
// if we don't wait for a second, the transaction is not confirmed yet, and thus the next transaction will fail
await new Promise((resolve) => setTimeout(resolve, 500));

// we need to create a new UTxO to use as collateral for the first script execution
const tx = await lucid
  .newTx()
  .collectFrom(await getUTxOsAtAddress(address))
  .payToAddress(address, { lovelace: BigInt(5e6) })
  .complete();
const collateralTx = await tx.sign().complete();
await collateralTx.submit();
await new Promise((resolve) => setTimeout(resolve, 500));

console.log("Created collateral UTxO");
console.log(await getUTxOsAtAddress(address));
async function createScriptRef() {
  const utxos = await getUTxOsAtAddress(address);
  const tx = await lucid
    .newTx()
    .collectFrom(utxos)
    .payToAddressWithData(
      scriptAddress,
      {
        scriptRef: { type: "PlutusV2", script: CBOR },
      },
      { lovelace: BigInt(2e6) },
    )
    .complete();
  const signedTx = await tx.sign().complete();
  await signedTx.submit();
  console.log("ScriptRef created", signedTx.toHash());
  return {
    hash: signedTx.toHash(),
    index: 0,
  };
}

async function getUTxOsAtAddress(address: string): Promise<UTxO[]> {
  const utxos = await getUTxO();
  return Object.entries(utxos)
    .filter(([_, output]) => output.address === address)
    .map((pair) => {
      const [txIn, output] = pair;
      const [txHash, ixStr] = txIn.split("#");
      return {
        txHash,
        outputIndex: Number.parseInt(ixStr),
        address: output.address,
        assets: recordValueToAssets(output.value),
      };
    });
}
// Callbacks from forked doom-wasm

type Cmd = { forwardMove: number };

let latestUTxO: UTxO | null = null;
let lastTime: number = 0;
let frameNumber = 0;

export enum GameState {
  GS_LEVEL,
  GS_INTERMISSION,
  GS_FINALE,
  GS_DEMOSCREEN,
}

export async function hydraSend(
  cmd: Cmd,
  player: Player,
  gameState: GameState,
) {
  console.log("hydraSend", cmd);

  if (gameState != GameState.GS_LEVEL) {
    return;
  }

  gameData.player = player;
  const utxos = await getUTxOsAtAddress(address);
  console.log("Current UTxOs owned by gamer", utxos);
  if (latestUTxO == null) {
    const utxo = utxos[0];
    latestUTxO = utxo;
  }
  console.log("spending from", latestUTxO);
  const tx = await buildTx(latestUTxO!, buildDatum(gameData), utxos[0]);

  lastTime = performance.now();
  if (frameNumber % 1 == 0) {
    const txid = await tx.submit();
    console.log("submitted", txid);
    latestUTxO.txHash = txid;
  }
  frameNumber++;

  // if we don't wait for a second, the transaction is not confirmed yet, and thus the next transaction will fail
  await new Promise((resolve) => setTimeout(resolve, 500));
}

export async function hydraRecv(): Promise<Cmd> {
  console.log("hydraRecv");
  return new Promise((res, rej) => {
    // TODO: re-use event listeners?
    const onMessage = (e: MessageEvent) => {
      const msg = JSON.parse(e.data);
      switch (msg.tag) {
        case "TxValid":
          let elapsed = performance.now() - lastTime;
          console.log("round trip: ", elapsed, "ms");
          const tx = lucid.fromTx(msg.transaction.cborHex);
          const datum = tx.txComplete
            .body()
            .outputs()
            .get(0)
            .datum()
            ?.as_data()
            ?.to_js_value().datum;
          const cmd = { forwardMove: datum.Integer };
          console.log("received", cmd);
          conn.removeEventListener("message", onMessage);
          res(cmd);
          break;
        // XXX: Learning: ideally we should be only acting on snapshot confirmed, but I was
        // inclined to use TxValid instead because it requires less book-keeping.
        case "SnapshotConfirmed":
          break;
        default:
          conn.removeEventListener("message", onMessage);
          rej("Unexpected message: " + e.data);
      }
    };
    conn.addEventListener("message", onMessage);
  });
}

const buildCollateralInput = (txHash: string, txIx: number) => {
  const transactionHash = C.TransactionHash.from_hex(txHash);
  const input = C.TransactionInput.new(
    transactionHash,
    C.BigNum.from_str(txIx.toString()),
  );
  const inputs = C.TransactionInputs.new();
  inputs.add(input);
  transactionHash.free();
  input.free();

  return inputs;
};

const buildTx = async (
  inputUtxo: UTxO,
  datum: string,
  collateralUtxo: UTxO,
): Promise<TxSigned> => {
  const tx = await lucid
    .newTx()
    .collectFrom([inputUtxo], Data.to(new Constr(0, [])))
    .payToContract(scriptAddress, { inline: datum }, { lovelace: BigInt(1e6) })
    .readFrom([
      {
        txHash: scriptRef.hash,
        outputIndex: scriptRef.index,
        address: scriptAddress,
        assets: { lovelace: BigInt(2e6) },
        scriptRef: {
          type: "PlutusV2",
          script: CBOR,
        },
      },
    ])
    .addSigner(address)
    .complete();

  const collateral = buildCollateralInput(
    collateralUtxo.txHash,
    collateralUtxo.outputIndex,
  );
  const txBody = tx.txComplete.body();
  const witnessSet = tx.txComplete.witness_set();
  const auxData = tx.txComplete.auxiliary_data();

  txBody.set_collateral(collateral);
  const collateralTx = C.Transaction.new(txBody, witnessSet, auxData);
  txBody.free();
  witnessSet.free();
  auxData?.free();
  collateral.free();
  tx.txComplete = collateralTx;
  // console.log("tx", tx);
  const signedTx = await tx.sign().complete();
  // console.log("signed", tx);
  console.log(toHex(signedTx.txSigned.to_bytes()));
  const body = signedTx.txSigned.body();
  const outputs = body.outputs();
  body.free();
  for (let i = 0; i < outputs.len(); i++) {
    const output = outputs.get(i);
    const address = output.address();
    if (address.to_bech32("addr_test") === scriptAddress) {
      const amount = output.amount();
      const datum = output.datum()!;
      const data = datum.as_data()!;

      latestUTxO = {
        txHash: signedTx.toHash(),
        outputIndex: i,
        address: address.to_bech32("addr_test"),
        assets: valueToAssets(amount),
        datumHash: null,
        datum: toHex(data.to_bytes()).substring(8),
        scriptRef: null,
      };
      amount.free();
      output.free();
      data.free();
      address.free();
      console.log("New UTxO", latestUTxO);
      break;
    }
    outputs.free();
    body.free();
  }

  return signedTx;
};
