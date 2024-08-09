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
  decodeDatum,
  hydraDatumToPlutus,
  initialGameData,
} from "./contract/datum";
import { CBOR } from "./contract/cbor";
import { UTxOResponse, recordValueToAssets } from "./types";
import { keys } from "./keys";
import { appendTx, session, updateUI } from "./stats";
import { setSpeedometerValue } from "./speedometer";

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
let hydraHttp: string;
let gameData: GameData;

let sessionStats = {
  transactions: 0,
  bytes: 0,
  kills: 0,
  items: 0,
  secrets: 0,
  play_time: 0,
};

export async function fetchNewGame() {
  if (!process.env.PERSISTENT_SESSION || node == null || scriptRef == null) {
    console.warn(`Starting new game for ${address}`);
    const response = await fetch(
      `${gameServerUrl}/new_game?address=${address}`,
    );
    const newGameResponse = await response.json();
    console.log(`New game successful with UTxO ${newGameResponse.player_utxo}`);
    node = newGameResponse.ip as string;
    admin_pkh = newGameResponse.admin_pkh as string;
    window.localStorage.setItem("hydra-doom-session-node", node);
    scriptRef = newGameResponse.script_ref as string;
    window.localStorage.setItem("hydra-doom-session-ref", scriptRef);
    sessionStats = {
      transactions: 0,
      bytes: 0,
      kills: 0,
      items: 0,
      secrets: 0,
      play_time: 0,
    };
  }
  console.log(
    `Using hydra node ${node} and game validator script at reference: ${scriptRef}`,
  );

  hydraHttp = `http://${node}`;
  console.log("Connecting lucid");
  lucid = await Lucid.new(new HydraProvider(hydraHttp), "Preprod");
  lucid.selectWalletFromPrivateKey(privateKey);

  console.log(`Connecting websocket ws://${node}`);
  const protocol = window.location.protocol == "https:" ? "wss://" : "ws://";
  connectHydra(protocol + `${node}`);

  // This is temporary, the initial game state is stored in a UTxO created by the control plane.
  // We need to add the ability to parse game state from the datum here.
  gameData = initialGameData(pkh, admin_pkh!);
}

const scriptAddress = lucid.utils.validatorToAddress({
  script: CBOR,
  type: "PlutusV2",
});

// Setup a lucid instance running against hydra

// Makeshift hydra client

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

let cmdQueue: Cmd[] = [];
let latestUTxO: UTxO | null = null;
let collateralUTxO: UTxO | null = null;

type SubmissionTimes = {
  [key: string]: {
    submitted: number;
    seen: number | null;
    confirmed: number | null;
  };
};
let submissionTimes: SubmissionTimes = {};

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
  if (!gameData) throw new Error("Game data not initialized");

  if (gameState != GameState.GS_LEVEL) {
    return;
  }

  console.log("hydraSend", cmd);

  gameData.player = player;
  // TODO: the latestUTxO should be fetched from the script address, filtering by admin in datum.
  if (latestUTxO == null) {
    const utxos = await getUTxOsAtAddress(scriptAddress);
    const runningGames = [];
    console.log(utxos);
    for (const utxo of utxos) {
      if (!utxo.datum) {
        continue;
      }
      const data = decodeDatum(utxo.datum);
      if (!!data) {
        runningGames.push(data.owner);
        if (data.owner == pkh) {
          latestUTxO = utxo;
          break;
        }
      }
    }
    if (!latestUTxO) {
      console.warn(
        `No UTxO found for gamer ${pkh}, out of ${utxos.length} games: ${runningGames.join(", ")}`,
      );
      return;
    }
    console.log("Current UTxO owned by gamer", JSON.stringify(latestUTxO));
  }
  if (!collateralUTxO) {
    const utxos = await getUTxOsAtAddress(address);
    collateralUTxO = utxos[0];
  }

  if (frameNumber % 3 == 0) {
    console.log("spending from", latestUTxO);
    const [newUtxo, tx] = await buildTx(
      latestUTxO!,
      encodeRedeemer(cmd),
      buildDatum(gameData),
      collateralUTxO!,
    );
    sessionStats.transactions++;
    sessionStats.bytes += tx.txSigned.to_bytes().length;
    sessionStats.kills = gameData.player.killCount;
    updateUI(session, sessionStats);

    const now = performance.now();
    const txid = await tx.submit();
    appendTx(cmd, player);
    console.log("timing", now, "submitted", txid);
    submissionTimes[txid] = {
      submitted: now,
      seen: null,
      confirmed: null,
    };
    latestUTxO = newUtxo;
  }
  frameNumber++;
}

function connectHydra(url: string) {
  let conn = new WebSocket(`${url}?history=no`);
  conn.onopen = function () {
    console.log("Connected to hydra");
  };
  conn.onerror = function (error) {
    console.error("WebSocket Error:", error);
  };
  conn.onclose = function () {
    console.log("WebSocket connection closed");
  };
  conn.onmessage = (e: MessageEvent) => {
    const msg = JSON.parse(e.data);
    console.warn(msg);
    switch (msg.tag) {
      case "TxValid":
        const txid = msg.transaction.txId;
        // Record seen time
        if (submissionTimes[txid]) {
          const now = performance.now();
          const seenTime = now - submissionTimes[txid].submitted;
          submissionTimes[txid].seen = seenTime;
          console.info(
            "timing",
            now,
            "seen",
            msg.transaction.txId,
            "in",
            seenTime,
            "ms",
          );
        }
        // Decode cmd from redeemer
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
        cmdQueue.push(cmd);
        // FIXME: if our mainloop does not use `-hydraRecv` this queue grows big -> should cleanup
        if (cmdQueue.length > 1000) {
          console.warn(
            "Command queue grows big, should cleanup",
            cmdQueue.length,
          );
        }
        break;
      // XXX: Learning: ideally we should be only acting on snapshot confirmed, but I was
      // inclined to use TxValid instead because it requires less book-keeping.
      case "SnapshotConfirmed":
        const now = performance.now();
        // Record confirmation time
        for (const txid of msg.snapshot.confirmedTransactions) {
          const confirmationTime = now - submissionTimes[txid].submitted;
          submissionTimes[txid].confirmed = confirmationTime;
          console.info(
            "timing",
            now,
            "confirmed",
            txid,
            "in",
            confirmationTime,
            "ms",
          );
        }
        // Compute tps and clear submissionTimes
        // XXX: Weird algorithm: count confirmed txs, drop txs older than 1s
        let tps = 0;
        for (const txid in submissionTimes) {
          if (submissionTimes[txid].confirmed) {
            tps++;
          }
          if (submissionTimes[txid].submitted < now - 1000) {
            delete submissionTimes[txid];
          }
        }
        console.warn("tps", tps);
        setSpeedometerValue(tps);
        break;
      default:
        console.warn("Unexpected message: " + e.data);
    }
  };
}

export function hydraRecv(): Cmd {
  if (cmdQueue.length == 0) {
    return { forwardMove: 0, sideMove: 0 };
  }
  const cmd = cmdQueue.pop()!;
  console.log("hydraRecv", cmd);
  return cmd;
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
        txHash: scriptRef!.split("#")[0],
        outputIndex: Number(scriptRef!.split("#")[1]),
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
