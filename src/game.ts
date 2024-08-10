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

import {
  GameData,
  Player,
  PlayerStats,
  buildDatum,
  decodeDatum,
  hydraDatumToPlutus,
  initialGameData,
} from "./contract/datum";
import { CBOR } from "./contract/cbor";
import { keys } from "./keys";
import { appendTx, session, updateUI } from "./stats";
import { setSpeedometerValue } from "./speedometer";
import { Hydra } from "./hydra";

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
let hydra: Hydra | undefined = undefined;
let player_pkh: string;
let node = window.localStorage.getItem("hydra-doom-session-node");
let scriptRef = window.localStorage.getItem("hydra-doom-session-ref");
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
  try {
    console.log(`Starting new game for ${address}`);
    const response = await fetch(
      `${gameServerUrl}/new_game?address=${address}`,
    );
    const newGameResponse = await response.json();
    console.log(`New game successful with UTxO ${newGameResponse.player_utxo}`);
    node = newGameResponse.ip as string;
    player_pkh = newGameResponse.admin_pkh as string;
    scriptRef = newGameResponse.script_ref as string;
    window.localStorage.setItem("hydra-doom-session-node", node);
    window.localStorage.setItem("hydra-doom-session-ref", scriptRef);
    sessionStats = {
      transactions: 0,
      bytes: 0,
      kills: 0,
      items: 0,
      secrets: 0,
      play_time: 0,
    };
    // TODO: protocol from host
    hydra = new Hydra(`https://${node}`);
    await hydra.populateUTxO();
    hydra.onTxSeen = (txId, tx) => {
      console.log("seen", txId);
      const redeemer: Uint8Array | undefined = tx.txComplete
        .witness_set()
        .redeemers()
        ?.get(0)
        ?.data()
        .to_bytes();
      if (!redeemer) {
        return;
      }
      const cmd = decodeRedeemer(toHex(redeemer));
      cmdQueue.push(cmd);
      // append some representation of the tx into the UI
      appendTx(cmd);
      if (cmdQueue.length > 1000) {
        console.warn("Command queue grew big, purging 100 entries");
        cmdQueue = cmdQueue.slice(-100);
      }
      // console.log("seen", txId, "in", hydra!.tx_timings[txId]!.seen, "ms");
    };
    hydra.onTxConfirmed = (txId) => {
      console.log("confirmed", txId);
      // XXX: TPS only computed when tx confirmed -> does not go to 0 after some time
      const now = performance.now();
      let tps = 0;
      for (const txid in hydra!.tx_timings) {
        const timing = hydra!.tx_timings[txid]!;
        if (timing.confirmed && timing.sent + timing.confirmed > now - 1000) {
          // console.log("confirmed", txId, "in", timing.confirmed, "ms");
          tps++;
        }
      }
      console.log("confirmed tps", tps);
      setSpeedometerValue(tps);
    };
    hydra.onTxInvalid = (txId) => {
      console.error("invalid", txId);
      setSpeedometerValue(0);
    };
    latestUTxO = await hydra.awaitUtxo(newGameResponse.player_utxo, 5000);
    // HACK: until hydra returns the datum bytes, all the datum bytes will be wrong
    // so we return it from the newGameResponse and set it manually here
    latestUTxO.datum = newGameResponse.player_utxo_datum_hex;

    lucid = await Lucid.new(hydra, "Preprod");
    lucid.selectWalletFromPrivateKey(privateKey);

    // This is temporary, the initial game state is stored in a UTxO created by the control plane.
    // We need to add the ability to parse game state from the datum here.
    gameData = initialGameData(pkh, player_pkh!);
  } catch (e) {
    console.error("Error: ", e);
    throw e;
  }
}

const scriptAddress = lucid.utils.validatorToAddress({
  script: CBOR,
  type: "PlutusV2",
});

// Callbacks from forked doom-wasm

type Cmd = { forwardMove: number; sideMove: number };

let cmdQueue: Cmd[] = [];
let latestUTxO: UTxO | null = null;
let lastSent: number | null = null;
let collateralUTxO: UTxO | null = null;

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
  leveltime?: number,
) {
  if (!gameData || !hydra) throw new Error("Game data not initialized");

  if (gameState != GameState.GS_LEVEL) {
    return;
  }

  console.log("hydraSend", cmd);
  let hydraSendStart = performance.now();

  gameData.player = {
    ...player,
    totalStats: addPlayerStats(
      gameData.player.totalStats,
      subtractPlayerStats(player.levelStats, gameData.player.levelStats),
    ),
  };
  if (leveltime !== undefined) {
    if (leveltime < gameData.leveltime[0]) {
      gameData.leveltime.unshift(0);
    }

    gameData.leveltime[0] = leveltime;
  }
  // TODO: the latestUTxO should be fetched from the script address, filtering by admin in datum.
  if (latestUTxO == null) {
    const utxos = await hydra.getUtxos(scriptAddress);
    const runningGames = [];
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
  }
  if (!collateralUTxO) {
    const utxos = await hydra.getUtxos(address);
    collateralUTxO = utxos[0];
  }

  if (frameNumber % 1 == 0) {
    const [newUtxo, tx] = await buildTx(
      latestUTxO!,
      encodeRedeemer(cmd),
      buildDatum(gameData),
      collateralUTxO!,
    );

    sessionStats.transactions++;
    sessionStats.bytes += tx.txSigned.to_bytes().length;
    sessionStats.kills = gameData.player.totalStats.killCount;
    sessionStats.items = gameData.player.totalStats.itemCount;
    sessionStats.secrets = gameData.player.totalStats.secretCount;
    sessionStats.play_time = gameData.leveltime.reduce(
      (acc, curr) => acc + curr,
      0,
    );
    updateUI(session, sessionStats);

    await hydra.submitTx(tx.toString());
    // TODO: DRY with hydra.tx_timings
    lastSent = performance.now();
    latestUTxO = newUtxo;
    console.log(`hydraSend took ${performance.now() - hydraSendStart}ms`);
  }
  frameNumber++;
}

export async function hydraRecv(): Promise<Cmd | null> {
  return new Promise((res) => {
    const now = performance.now();
    console.log("hydraRecv", cmdQueue.length, lastSent ? now - lastSent : 0);
    if (cmdQueue.length > 0) {
      res(cmdQueue.shift()!);
      return;
    }

    // If we never sent, yield an empty cmd to the game
    if (!lastSent) {
      res(null);
      return;
    }

    // Otherwise block and wait for the queue to fill up
    // FIXME: why does this not properly block the game?
    const interval = setInterval(() => {
      if (cmdQueue.length > 0) {
        clearInterval(interval);
        res(cmdQueue.shift()!);
      }
    }, 10);
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
  // console.log(toHex(signedTx.txSigned.to_bytes()));
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

const subtractPlayerStats = (left: PlayerStats, right: PlayerStats) => {
  if (isZeroStats(left)) {
    return left;
  }

  return {
    itemCount: left.itemCount - right.itemCount,
    killCount: left.killCount - right.killCount,
    secretCount: left.secretCount - right.secretCount,
  };
};

const addPlayerStats = (
  left: PlayerStats,
  right: PlayerStats,
): PlayerStats => ({
  itemCount: left.itemCount + right.itemCount,
  killCount: left.killCount + right.killCount,
  secretCount: left.secretCount + right.secretCount,
});

const isZeroStats = (stats: PlayerStats) =>
  stats.itemCount === 0 && stats.killCount === 0 && stats.secretCount === 0;
