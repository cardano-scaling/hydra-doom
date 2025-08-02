import {
  C,
  Constr,
  Data,
  Lucid,
  ScriptHash,
  TxSigned,
  UTxO,
  toHex,
  valueToAssets,
} from "lucid-cardano";

import { CBOR } from "./contract/cbor";
import {
  GameData,
  LevelId,
  Player,
  PlayerStats,
  buildDatum,
  decodeDatum,
  hydraDatumToPlutus,
  initialGameData,
} from "./contract/datum";
import { Hydra } from "./hydra";
import { keys } from "./keys";
// import { setLocalSpeedometerValue } from "./speedometer";
import { appendTx, session, updateUI } from "./stats";

import * as ed25519 from "@noble/ed25519";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { blake2b } from "@noble/hashes/blake2b";
import { sha512 } from "@noble/hashes/sha512";

ed25519.etc.sha512Sync = (...m) => sha512(ed25519.etc.concatBytes(...m));

let gameServerUrl = process.env.SERVER_URL;
if (!gameServerUrl) {
  gameServerUrl = "http://localhost:8000";
  console.warn(
    `Defaulting SERVER_URL to ${gameServerUrl}, use .env to configure`,
  );
}
let lucid = await Lucid.new(undefined, "Preprod");
let { sessionKey, privateKey, sessionPk } = keys;
const address = await lucid
  .selectWalletFromPrivateKey(sessionKey)
  .wallet.address();
const pkh = lucid.utils.getAddressDetails(address).paymentCredential?.hash!;
console.log(`Using session key with address: ${address}`);

// Continue or fetch a game session
let hydra: Hydra | undefined = undefined;
let player_pkh: string;
let node = window.localStorage.getItem("hydra-doom-session-node");
let scriptRef = window.localStorage.getItem("hydra-doom-session-ref");
let gameData: GameData;
let stop = false;

let sessionStats = {
  transactions: 0,
  bytes: 0,
  total_kills: 0,
  total_items: 0,
  total_secrets: 0,
  total_play_time: 0,
};

export async function fetchNewGame(region: string) {
  if (!gameServerUrl) {
    throw new Error("No game server URL configured");
  }
  try {
    console.log(`Starting new game for ${address}`);
    const response = await fetch(
      `${gameServerUrl}/new_game?address=${address}&region=${process.env.REGION ?? region}&reserved=${!!process.env.CABINET_KEY}`,
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
      total_kills: 0,
      total_items: 0,
      total_secrets: 0,
      total_play_time: 0,
    };
    // TODO: protocol from host
    const protocol = gameServerUrl.startsWith("https") ? "https" : "http";

    hydra = new Hydra(`${protocol}://${node}`, 100);
    await hydra.init();
    await hydra.populateUTxO();
    hydra.onTxSeen = (_txId) => {
          };
    hydra.onTxConfirmed = (txId, tx) => {

      const redeemer: Uint8Array | undefined = tx.txComplete
        .witness_set()
        .redeemers()
        ?.get(0)
        ?.data()
        .to_bytes();
      if (!redeemer) {
        return;
      }
      const cmds = decodeRedeemer(toHex(redeemer));
      cmds.forEach((cmd) => {
        cmdQueue.push(cmd);
        // append some representation of the tx into the UI
        appendTx(cmd);
        if (cmdQueue.length > 1000) {
          console.warn("Command queue grew big, purging 100 entries");
          cmdQueue = cmdQueue.slice(-100);
        }
      });
      // XXX: TPS only computed when tx confirmed -> does not go to 0 after some time
      const now = performance.now();
      let tps = 0;
      for (const txid in hydra!.tx_timings) {
        const timing = hydra!.tx_timings[txid]!;
        if (timing.confirmed && timing.sent + timing.confirmed > now - 1000) {
          tps++;
        }
      }
      // setLocalSpeedometerValue(tps);
    };
    hydra.onTxInvalid = (txId) => {
      console.error("invalid", txId);
      // setLocalSpeedometerValue(0);
      stop = true;
    };
    latestUTxO = await hydra.awaitUtxo(newGameResponse.player_utxo, 5000);
    // HACK: until hydra returns the datum bytes, all the datum bytes will be wrong
    // so we return it from the newGameResponse and set it manually here
    latestUTxO.datum = newGameResponse.player_utxo_datum_hex;
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
const scriptHash: ScriptHash =
  lucid.utils.getAddressDetails(scriptAddress).paymentCredential?.hash!;

const COST_MODELS =
  "A10198AF1A000189B41901A401011903E818AD00011903E819EA350401192BAF18201A000312591920A404193E801864193E801864193E801864193E801864193E801864193E80186418641864193E8018641A000170A718201A00020782182019F016041A0001194A18B2000119568718201A0001643519030104021A00014F581A00037C71187A0001011903E819A7A90402195FE419733A1826011A000DB464196A8F0119CA3F19022E011999101903E819ECB2011A00022A4718201A000144CE1820193BC318201A0001291101193371041956540A197147184A01197147184A0119A9151902280119AECD19021D0119843C18201A00010A9618201A00011AAA1820191C4B1820191CDF1820192D1A18201A00014F581A00037C71187A0001011A0001614219020700011A000122C118201A00014F581A00037C71187A0001011A00014F581A00037C71187A0001011A000E94721A0003414000021A0004213C19583C041A00163CAD19FC3604194FF30104001A00022AA818201A000189B41901A401011A00013EFF182019E86A1820194EAE182019600C1820195108182019654D182019602F18201A0290F1E70A1A032E93AF1937FD0A1A0298E40B1966C40A";

// Callbacks from forked doom-wasm

type Cmd = {
  forwardMove: number;
  sideMove: number;
  angleTurn: number;
  chatChar: number;
  buttons: number;
  buttons2: number;
  consistancy: number;
  inventory: number;
  lookFly: number;
  arti: number;
};

let cmdQueue: Cmd[] = [];
let latestUTxO: UTxO | null = null;
let collateralUTxO: UTxO | null = null;

let frameNumber = 0;
let redeemerQueue: Cmd[] = [];

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
  leveltime: number,
  level: LevelId,
) {
  if (stop) throw new Error("stop");

  if (!gameData || !hydra) throw new Error("Game data not initialized");

  if (gameState != GameState.GS_LEVEL) {
    return;
  }
  // console.log("hydraSend", cmd);
  let hydraSendStart = performance.now();
  gameData.level = level;

  if (!level.demoplayback || player.cheats != 0) {
    gameData.player = {
      ...player,
      totalStats: addPlayerStats(
        gameData.player.totalStats,
        subtractPlayerStats(player.levelStats, gameData.player.levelStats),
      ),
    };

    if (leveltime < gameData.leveltime[0] || gameData.leveltime.length == 0) {
      gameData.leveltime.unshift(leveltime);
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

  redeemerQueue.push(cmd);

  if (frameNumber % 1 == 0) {
    const [newUtxo, tx] = buildTx(
      latestUTxO!,
      encodeRedeemer(redeemerQueue),
      buildDatum(gameData),
      collateralUTxO!,
    );

    sessionStats.transactions++;
    sessionStats.bytes += tx.length / 2;
    sessionStats.total_kills = gameData.player.totalStats.killCount;
    sessionStats.total_items = gameData.player.totalStats.itemCount;
    sessionStats.total_secrets = gameData.player.totalStats.secretCount;
    sessionStats.total_play_time = gameData.leveltime.reduce(
      (acc, curr) => acc + curr,
      0,
    );
    updateUI(session, sessionStats);

    await hydra.submitTx(tx);
    latestUTxO = newUtxo;
    redeemerQueue = [];
    // console.log(`submitted ${tx.toHash()}, took ${performance.now() - hydraSendStart}ms`);
  }
  frameNumber++;
}

export function hydraRecv(): Cmd | null {
  // console.log("hydraRecv", cmdQueue.length);
  if (cmdQueue.length == 0) {
    return null;
  }
  const cmd = cmdQueue.pop()!;
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

const encodeRedeemer = (cmds: Cmd[]): string => {
  return Data.to(
    new Constr(1, [
      cmds.map(
        ({
          forwardMove,
          sideMove,
          angleTurn,
          chatChar,
          buttons,
          buttons2,
          consistancy,
          inventory,
          lookFly,
          arti,
        }) =>
          new Constr(0, [
            BigInt(forwardMove),
            BigInt(sideMove),
            BigInt(angleTurn),
            BigInt(chatChar),
            BigInt(buttons),
            BigInt(buttons2),
            BigInt(consistancy),
            BigInt(inventory),
            BigInt(lookFly),
            BigInt(arti),
          ]),
      ),
    ]),
  );
};

const decodeRedeemer = (redeemer: string): Cmd[] => {
  const cmds = (Data.from(redeemer) as Constr<Data>).fields[0] as Array<
    Constr<Data>
  >;
  return cmds.map(
    (cmd) =>
      ({
        forwardMove: Number(cmd.fields[0]),
        sideMove: Number(cmd.fields[1]),
        angleTurn: Number(cmd.fields[2]),
        chatChar: Number(cmd.fields[3]),
        buttons: Number(cmd.fields[4]),
        buttons2: Number(cmd.fields[5]),
        consistancy: Number(cmd.fields[6]),
        inventory: Number(cmd.fields[7]),
        lookFly: Number(cmd.fields[8]),
        arti: Number(cmd.fields[9]),
      }) as Cmd,
  );
};
const buildTx = (
  inputUtxo: UTxO,
  redeemer: string,
  datum: string,
  collateralUtxo: UTxO,
): [UTxO, string] => {
  // Hand-roll transaction creation for more performance
  // NOTE: Redeemer is always using max ex units
  const redeemerBlock = `81840000${redeemer}821a00d59f801b00000002540be400`;
  const datumBlock = ``; // No datums in the witness set, so this is empty string
  const scriptData = `${redeemerBlock}${datumBlock}${COST_MODELS}`;
  const scriptDataHash = bytesToHex(
    blake2b(hexToBytes(scriptData), { dkLen: 256 / 8 }),
  );
  const datumLength = datum.length / 2;
  const txBodyByHand =
    `a7` + // Prefix
    `0081825820${inputUtxo.txHash}0${inputUtxo.outputIndex}` + // One input
    `0181a300581d70${scriptHash}018200a0028201d81858${datumLength.toString(16)}${datum}` + // Output to script hash with datum
    `0200` + // No fee
    `0b5820${scriptDataHash}` + // Script data hash, spooky
    `0d81825820${collateralUtxo.txHash}0${collateralUtxo.outputIndex}` + // Collatteral Input
    `0e81581c${pkh}` + // Required Signers
    `1281825820${scriptRef!.split("#")[0]}0${scriptRef!.split("#")[1]}`; // Reference inputs

  const txId = bytesToHex(
    blake2b(hexToBytes(txBodyByHand), { dkLen: 256 / 8 }),
  );
  const signature = bytesToHex(ed25519.sign(txId, privateKey));

  const witnessSetByHand = `a20081825820${sessionPk}5840${signature}05${redeemerBlock}`; // a single redeemer in witness set
  const txByHand = `84${txBodyByHand}${witnessSetByHand}f5f6`;

  const newUtxo: UTxO = {
    txHash: txId,
    outputIndex: 0,
    address: scriptAddress,
    assets: { lovelace: 0n },
    datumHash: null,
    datum: datum,
    scriptRef: null,
  };

  return [newUtxo, txByHand];
};

const subtractPlayerStats = (left?: PlayerStats, right?: PlayerStats) => {
  if (!left || !right) {
    return {
      itemCount: 0,
      killCount: 0,
      secretCount: 0,
    };
  }
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
  stats?.itemCount === 0 && stats.killCount === 0 && stats.secretCount === 0;
