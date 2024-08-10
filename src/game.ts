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
import { setLocalSpeedometerValue } from "./speedometer";
import { appendTx, session, updateUI } from "./stats";

import * as ed25519 from "@noble/ed25519";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { blake2b } from "@noble/hashes/blake2b";

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
    await hydra.populateUTxO();
    hydra.onTxSeen = (_txId, tx) => {
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
        false && cmdQueue.push(cmd);
        // append some representation of the tx into the UI
        appendTx(cmd);
        if (cmdQueue.length > 1000) {
          console.warn("Command queue grew big, purging 100 entries");
          cmdQueue = cmdQueue.slice(-100);
        }
      });
    };
    hydra.onTxConfirmed = (txId) => {
      console.log("confirmed", txId);
      // XXX: TPS only computed when tx confirmed -> does not go to 0 after some time
      const now = performance.now();
      let tps = 0;
      for (const txid in hydra!.tx_timings) {
        const timing = hydra!.tx_timings[txid]!;
        if (timing.confirmed && timing.sent + timing.confirmed > now - 1000) {
          tps++;
        }
      }
      console.log("confirmed tps", tps);
      setLocalSpeedometerValue(tps);
    };
    hydra.onTxInvalid = (txId) => {
      console.error("invalid", txId);
      setLocalSpeedometerValue(0);
      stop = true;
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
const scriptHash: ScriptHash =
  lucid.utils.getAddressDetails(scriptAddress).paymentCredential?.hash!;

const COST_MODELS =
  "a10198af1a0003236119032c01011903e819023b00011903e8195e7104011903e818201a0001ca761928eb041959d818641959d818641959d818641959d818641959d818641959d81864186418641959d81864194c5118201a0002acfa182019b551041a000363151901ff00011a00015c3518201a000797751936f404021a0002ff941a0006ea7818dc0001011903e8196ff604021a0003bd081a00034ec5183e011a00102e0f19312a011a00032e801901a5011a0002da781903e819cf06011a00013a34182019a8f118201903e818201a00013aac0119e143041903e80a1a00030219189c011a00030219189c011a0003207c1901d9011a000330001901ff0119ccf3182019fd40182019ffd5182019581e18201940b318201a00012adf18201a0002ff941a0006ea7818dc0001011a00010f92192da7000119eabb18201a0002ff941a0006ea7818dc0001011a0002ff941a0006ea7818dc0001011a0011b22c1a0005fdde00021a000c504e197712041a001d6af61a0001425b041a00040c660004001a00014fab18201a0003236119032c010119a0de18201a00033d7618201979f41820197fb8182019a95d1820197df718201995aa18201a0223accc0a1a0374f693194a1f0a1a02515e841980b30a";

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
  if (!gameData || !hydra) throw new Error("Game data not initialized");

  if (gameState != GameState.GS_LEVEL) {
    return;
  }
  console.log("hydraSend", cmd);
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
    const [newUtxo, tx] = await buildTx(
      latestUTxO!,
      encodeRedeemer(redeemerQueue),
      buildDatum(gameData),
      collateralUTxO!,
    );

    sessionStats.transactions++;
    sessionStats.bytes += tx.txSigned.to_bytes().length;
    sessionStats.total_kills = gameData.player.totalStats.killCount;
    sessionStats.total_items = gameData.player.totalStats.itemCount;
    sessionStats.total_secrets = gameData.player.totalStats.secretCount;
    sessionStats.total_play_time = gameData.leveltime.reduce(
      (acc, curr) => acc + curr,
      0,
    );
    updateUI(session, sessionStats);

    await hydra.submitTx(tx.toString());
    latestUTxO = newUtxo;
    redeemerQueue = [];
    console.log(
      `submitted ${tx.toHash()}, took ${performance.now() - hydraSendStart}ms`,
    );
  }
  frameNumber++;
}

export function hydraRecv(): Cmd {
  console.log("hydraRecv", cmdQueue.length);
  if (cmdQueue.length == 0) {
    return {
      forwardMove: 0,
      sideMove: 0,
      angleTurn: 0,
      chatChar: 0,
      buttons: 0,
      buttons2: 0,
      consistancy: 0,
      inventory: 0,
      lookFly: 0,
      arti: 0,
    };
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
const buildTx = async (
  inputUtxo: UTxO,
  redeemer: string,
  datum: string,
  collateralUtxo: UTxO,
): Promise<[UTxO, TxSigned]> => {
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
  const witnessSetByHand = `a105${redeemerBlock}`; // a single redeemer in witness set
  const txByHand = `84${txBodyByHand}${witnessSetByHand}f5f6`;

  // Still use lucid for signing with configured key
  const tx = lucid.fromTx(txByHand);
  const signedTx = await tx.sign().complete();

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
