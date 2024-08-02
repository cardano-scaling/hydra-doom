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
  Player,
  buildDatum,
  decodeDatum,
  hydraDatumToPlutus,
  initialGameData,
} from "./contract/datum";
import { CBOR } from "./contract/cbor";
import { UTxOResponse, recordValueToAssets } from "./types";
import { keys } from "./keys";

let gameServerUrl = process.env.SERVER_URL;
if (!gameServerUrl) {
  gameServerUrl = "http://localhost:8000";
  console.warn(
    `Defaulting SERVER_URL to ${gameServerUrl}, use .env to configure`,
  );
}
let lucid = await Lucid.new(undefined, "Preprod");
let { sessionKey: privateKey } = keys;
const address = await lucid
  .selectWalletFromPrivateKey(privateKey)
  .wallet.address();
const pkh = lucid.utils.getAddressDetails(address).paymentCredential?.hash!;
console.log(`Using session key with address: ${address}`);

// Continue or fetch a game session
let admin_pkh: string;
let node = window.localStorage.getItem("hydra-doom-session-node");
let scriptRef = window.localStorage.getItem("hydra-doom-session-ref");
if (!process.env.PERSISTENT_SESSION || node == null || scriptRef == null) {
  console.warn(`Starting new game for ${address}`);
  const response = await fetch(`${gameServerUrl}/new_game?address=${address}`);
  const newGameResponse = await response.json();
  node = newGameResponse.ip as string;
  admin_pkh = newGameResponse.admin_pkh as string;
  window.localStorage.setItem("hydra-doom-session-node", node);
  scriptRef = newGameResponse.script_ref as string;
  window.localStorage.setItem("hydra-doom-session-ref", scriptRef);
}
console.log(
  `Using hydra node ${node} and game validator script at reference: ${scriptRef}`,
);

// This is temporary, the initial game state is stored in a UTxO created by the control plane.
// We need to add the ability to parse game state from the datum here.
const gameData = initialGameData(pkh, admin_pkh!);
const scriptAddress = lucid.utils.validatorToAddress({
  script: CBOR,
  type: "PlutusV2",
});

// Setup a lucid instance running against hydra

const hydraHttp = `http://${node}`;
console.log("Connecting lucid");
lucid = await Lucid.new(new HydraProvider(hydraHttp), "Preprod");
lucid.selectWalletFromPrivateKey(privateKey);

// Makeshift hydra client

console.log(`Connecting websocket ws://${node}`);
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
        datum: output.inlineDatum ?? output.datum,
        outputIndex: Number.parseInt(ixStr),
        address: output.address,
        assets: recordValueToAssets(output.value),
      };
    });
}
// Callbacks from forked doom-wasm

type Cmd = { forwardMove: number; sideMove: number };

let latestUTxO: UTxO | null = null;
let collateralUTxO: UTxO | null = null;
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
  if (latestUTxO == null) {
    const utxos = await getUTxOsAtAddress(scriptAddress);
    console.log(utxos);
    for (const utxo of utxos) {
      if (!utxo.datum) {
        continue;
      }
      console.log(utxo);
      const data = decodeDatum(utxo.datum);
      if (!!data && data.owner == pkh) {
        latestUTxO = utxo;
        break;
      }
    }
    if (!latestUTxO) {
      throw new Error("No UTxO found for admin");
    }
    console.log("Current UTxO owned by gamer", JSON.stringify(latestUTxO));
  }
  if (!collateralUTxO) {
    const utxos = await getUTxOsAtAddress(address);
    collateralUTxO = utxos[0];
  }

  console.log("spending from", latestUTxO);
  const [newUtxo, tx] = await buildTx(
    latestUTxO!,
    encodeRedeemer(cmd),
    buildDatum(gameData),
    collateralUTxO!,
  );

  lastTime = performance.now();
  if (frameNumber % 1 == 0) {
    const txid = await tx.submit();
    console.log("submitted", txid);
    latestUTxO = newUtxo;
  }
  frameNumber++;
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
          const redeemer: Uint8Array | undefined = tx.txComplete
            .witness_set()
            .redeemers()
            ?.get(0)
            ?.data()
            .to_bytes();
          if (!redeemer) {
            throw new Error("Redeemer not found");
          }
          const cmd = decodeRedeemer(toHex(redeemer));
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

const encodeRedeemer = (cmd: Cmd): string => {
  return Data.to(
    new Constr(1, [
      new Constr(0, [
        BigInt(cmd.forwardMove),
        BigInt(cmd.sideMove),
        BigInt(0),
        [],
      ]),
    ]),
  );
};

const decodeRedeemer = (redeemer: string): Cmd => {
  const d = (Data.from(redeemer) as Constr<Data>).fields[0] as Constr<Data>;

  return { forwardMove: Number(d.fields[0]), sideMove: Number(d.fields[1]) };
};

const buildTx = async (
  inputUtxo: UTxO,
  redeemer: string,
  datum: string,
  collateralUtxo: UTxO,
): Promise<[UTxO, TxSigned]> => {
  // HACK: hydra returns a decoded/json format of the datum, so we coerce it back here
  let lucidUtxo = {
    txHash: inputUtxo.txHash,
    outputIndex: inputUtxo.outputIndex,
    address: inputUtxo.address,
    assets: inputUtxo.assets,
    datum:
      !!inputUtxo.datum && typeof inputUtxo.datum !== "string"
        ? Data.to(hydraDatumToPlutus(inputUtxo.datum))
        : inputUtxo.datum,
    datumHash: inputUtxo.datumHash,
    scriptRef: inputUtxo.scriptRef,
  };
  const tx = await lucid
    .newTx()
    .collectFrom([lucidUtxo], redeemer)
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
  let newUtxo: UTxO | null = null;
  for (let i = 0; i < outputs.len(); i++) {
    const output = outputs.get(i);
    const address = output.address();
    if (address.to_bech32("addr_test") === scriptAddress) {
      const amount = output.amount();
      const datum = output.datum()!;
      const data = datum.as_data()!;

      newUtxo = {
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
      break;
    }
    outputs.free();
    body.free();
  }

  return [newUtxo!, signedTx];
};
