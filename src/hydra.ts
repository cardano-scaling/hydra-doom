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

if (!process.env.SERVER_URL) {
  throw new Error("SERVER_URL not set in environment");
}

console.log("Generating ephemeral keypair");
const setupLucid = await Lucid.new(undefined, "Preprod");
const privateKey = setupLucid.utils.generatePrivateKey();
const address = await setupLucid
  .selectWalletFromPrivateKey(privateKey)
  .wallet.address();
const pkh =
  setupLucid.utils.getAddressDetails(address).paymentCredential?.hash!;
console.log(`Generated ephemeral keypair: ${address}`);
// This is temporary, the initial game state is stored in a UTxO created by the control plane.
// We need to add the ability to parse game state from the datum here.
const gameData = initialGameData(pkh);
const response = await fetch(
  `${process.env.SERVER_URL}/new_game?address=${address}`,
);
const newGameResponse = await response.json();
const node = newGameResponse.ip as string;
const scriptRef = newGameResponse.script_ref as string;

const scriptAddress = setupLucid.utils.validatorToAddress({
  script: CBOR,
  type: "PlutusV2",
});

// Setup a lucid instance running against hydra

const hydraHttp = `http://${node}`;
console.log("Setting up a lucid instance against hydra");
const lucid = await Lucid.new(new HydraProvider(hydraHttp), "Preprod");
lucid.selectWalletFromPrivateKey(privateKey);
console.log(lucid);

// Makeshift hydra client

console.log(`connecting to hydra head at ws://${node}`);

const protocol = window.location.protocol == "https:" ? "wss://" : "ws://";
const conn = new WebSocket(protocol + `${node}?history=no`);

async function getUTxO(): Promise<UTxOResponse> {
  const res = await fetch(`${hydraHttp}/snapshot/utxo`);
  return res.json();
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
  // TODO: the latestUTxO should be fetched from the script address, filtering by admin in datum.
  const utxos = await getUTxOsAtAddress(address);
  console.log("Current UTxOs owned by gamer", JSON.stringify(utxos));
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
    .payToContract(scriptAddress, { inline: datum }, { lovelace: BigInt(0) })
    .readFrom([
      {
        txHash: scriptRef.split("#")[0],
        outputIndex: Number(scriptRef.split("#")[1]),
        address: scriptAddress,
        assets: { lovelace: BigInt(0) },
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
