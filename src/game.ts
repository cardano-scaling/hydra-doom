import {
  C,
  Constr,
  Data,
  Lucid,
  TxSigned,
  UTxO,
  toHex,
  valueToAssets,
} from "lucid-cardano";

import { CBOR } from "./contract/cbor";
import {
  GameData,
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
  total_play_time: 0,
};

export async function fetchNewGame(region: string) {
  try {
    console.log(`Starting new game for ${address}`);
    const response = await fetch(
      `${gameServerUrl}/new_game?address=${address}&region=${process.env.REGION ?? region}&reserved=${!!process.env.CABINET_KEY}`
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
      total_play_time: 0,
    };
    // TODO: protocol from host
    hydra = new Hydra(`https://${node}`, 100);
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
      const cmd = decodeRedeemer(toHex(redeemer));
      cmdQueue.push(cmd);
      // append some representation of the tx into the UI
      appendTx(cmd);
      if (cmdQueue.length > 1000) {
        console.warn(
          "Command queue grows big, should cleanup",
          cmdQueue.length,
        );
      }
    };
    hydra.onTxConfirmed = () => {
      const now = performance.now();
      let tps = 0;
      for (const txid in hydra!.tx_timings) {
        const timing = hydra!.tx_timings[txid];
        const confirm_time = timing.sent + (timing?.confirmed ?? 0);
        if (hydra!.tx_timings[txid]?.confirmed && confirm_time > now - 1000) {
          tps++;
        }
      }
      setLocalSpeedometerValue(tps);
    };
    hydra.startEventLoop();
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

  if (frameNumber % 8 !== 0 && frameNumber % 2 == 0) {
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
    sessionStats.total_play_time = gameData.leveltime.reduce(
      (acc, curr) => acc + curr,
      0,
    );
    updateUI(session, sessionStats);

    hydra.queueTx(tx.toString(), tx.toHash());
    latestUTxO = newUtxo;
  }
  frameNumber++;
}

export function hydraRecv(): Cmd {
  if (cmdQueue.length == 0) {
    return { forwardMove: 0, sideMove: 0 };
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
