// Run as a node process to run a referee doom server

import { readFile } from "node:fs/promises";
import { HydraMultiplayerServer } from "utils/HydraMultiplayer/server";
import { Lucid, toHex, fromHex } from "lucid-cardano";
import * as bech32 from "bech32-buffer";
import * as ed25519 from "@noble/ed25519";
import { blake2b } from "@noble/hashes/blake2b";
import { KinesisClient, PutRecordsCommand } from "@aws-sdk/client-kinesis";

const NETWORK_ID = Number(process.env.NETWORK_ID);
const HYDRA_NODE = "http://localhost:4001/";
const RECORD_STATS = true;

const kinesis = new KinesisClient({ region: "us-east-1" }); // TODO: env variable?
const encoder = new TextEncoder();

async function sendEvent(gameId, data) {
  const dataRaw = encoder.encode(
    JSON.stringify({
      timestamp: new Date().valueOf(),
      data,
    }),
  );
  const record = {
    Records: [
      {
        Data: dataRaw,
        PartitionKey: gameId,
      },
    ],
    StreamName: "hydra-doom-event-queue",
  };
  const command = new PutRecordsCommand(record);
  return kinesis.send(command);
}

let done = false;
const lucid = await Lucid.new(
  undefined,
  NETWORK_ID === 1 ? "Mainnet" : "Preprod",
);
const adminKeyFile = process.env.ADMIN_KEY_FILE ?? "admin.sk";
const adminKey = JSON.parse((await readFile(adminKeyFile)).toString());
const privateKeyBytes = adminKey.cborHex.slice(4);
const sessionKeyBech32 = bech32.encode("ed25519_sk", fromHex(privateKeyBytes));

const publicKeyBytes = await ed25519.getPublicKeyAsync(privateKeyBytes);
const publicKeyHashBytes = blake2b(publicKeyBytes, { dkLen: 224 / 8 });
const publicKeyHashHex = toHex(publicKeyHashBytes);
const keys = {
  sessionKeyBech32,
  privateKeyBytes,
  privateKeyHex: toHex(privateKeyBytes),
  publicKeyBytes,
  publicKeyHex: toHex(publicKeyBytes),
  publicKeyHashBytes,
  publicKeyHashHex,
  address: lucid.utils.credentialToAddress({
    type: "Key",
    hash: publicKeyHashHex,
  }),
};
console.log("Address: ", keys.address);

const { default: createModule } = await import("../websockets-doom.js");
const module = await createModule({
  locateFile: (path, scripts) => {
    return scripts + "public/" + path;
  },
  noInitialRun: true,
  preRun: function (mod: any) {
    const files = [
      "freedoom2.wad",
      "default.cfg",
      "dm_iog.wad",
      "iog_assets.wad",
    ];
    files.forEach((file) => {
      mod.FS!.createPreloadedFile("/", file, "../public/" + file, true, true);
    });
  },
  canvas: null as any,
  print: (text: string) => {
    console.log("stdout:", text);
  },
  printErr: (text: string) => {
    console.error("stderr:", text);
  },
  onExit: () => {
    console.log("Game exited");
    done = true;
  },
});
global.Module = module;

const hydra = new HydraMultiplayerServer({
  key: keys,
  address: keys.address,
  url: HYDRA_NODE,
  module,
});
global.HydraMultiplayer = hydra;

// NOTE: a lot of this code is brittle, because we're relying on the timing of transactions to match the game
// There's not another clean way to map the ephemeral key to doom's notion of "player" index without a bunch of refactoring
// That being said, for the purposes of the tournament, it should be a non-issue
let expectedHumans = 0;
let expectedBots = 0;
let timeout = 60_000;
let gameId = "";
const actors = [];
const players = [];
const isHuman = [];

global.gameStarted = async () => {
  console.log(`Game started with ${players.length} connected players or bots`);
  // Fill in the rest of the actors with the admin key
  while (players.length < expectedHumans + expectedBots) {
    actors.push(keys.publicKeyHashHex); // TODO: give each bot their own key? have htem join the game?
    players.push(keys.publicKeyHashHex);
    isHuman.push(false);
  }

  console.log("Updating game state to 'Running'.");
  try {
    await fetch("http://localhost:8000/game/start_game", {
      method: "POST",
    });
  } catch (e) {
    console.warn("Failed to update game state to 'Running': ", e);
  }
  if (!RECORD_STATS) return;
  try {
    await Promise.all([
      fetch("http://localhost:8000/start_game", { method: "POST" }),
      sendEvent(gameId, {
        type: "game_started",
        game_id: gameId,
        keys: players,
      }),
    ]);
  } catch (e) {
    console.warn("Failed to record game start: ", e);
  }
};

let actorsInGame = 0;
global.playerConnected = async () => {
  // NOTE: technically a subtle race condition here, but it won't be relevant for the event
  actorsInGame++;
  if (actorsInGame == 1 && expectedBots == 0) {
    console.log(`Observer joined`);
  } else {
    console.log(
      `Player or bot joined (${actors[actorsInGame - 1]}), now ${actorsInGame} connected actors`,
    );
    if (!RECORD_STATS) return;
    try {
      await fetch("http://localhost:8000/player_joined", { method: "POST" });
    } catch (e) {
      console.warn("Failed to record player joined: ", e);
    }
  }
};
global.playerDisconnected = async () => {
  actorsInGame--;
  console.log(
    `Player or bot disconnected, now ${actorsInGame} connected actors`,
  );
  if (actorsInGame <= expectedBots) {
    // Only bots left, so we can end the game
    console.log(
      "All human players disconnected, or one of the AIs lost connection, ending game",
    );
    done = true;
  }
  if (!RECORD_STATS) return;
  try {
    await fetch("http://localhost:8000/player_left", { method: "POST" });
  } catch (e) {
    console.warn("Failed to record player left: ", e);
  }
};
global.kill = async (killer, victim) => {
  console.log(
    `Player ${killer} (${players[killer]}) killed ${victim} (${players[victim]})`,
  );
  if (!RECORD_STATS) return;
  try {
    await Promise.all([
      fetch("http://localhost:8000/player_killed", { method: "POST" }),
      sendEvent(gameId, {
        type: "kill",
        game_id: gameId,
        killer: players[killer],
        victim: players[victim],
      }),
    ]);
  } catch (e) {
    console.warn("Failed to record a kill: ", e);
  }
};
// TODO: collapse down into kill
global.suicide = async (player) => {
  console.log(`Player ${player} suicided`);
  if (!RECORD_STATS) return;
  try {
    await Promise.all([
      fetch("http://localhost:8000/player_suicided", { method: "POST" }),
      sendEvent(gameId, {
        type: "kill",
        game_id: gameId,
        killer: actors[player],
        victim: actors[player],
      }),
    ]);
  } catch (e) {
    console.warn("Failed to record a suicide: ", e);
  }
};

// check for extraneous state utxos and cleanup
try {
  console.log("Checking head's utxo set for stale games...");
  const response = await fetch(`${HYDRA_NODE}snapshot/utxo`);
  const data = await response.json();
  // Currently, we are just wiping the utxos after every game
  // We may want to make this logic more robust if we are hoping to preserve those utxos
  if (Object.keys(data).length > 1) {
    console.log("Cleaning up old game state");
    try {
      await fetch("http://localhost:8000/game/cleanup", {
        method: "POST",
      });
    } catch (e) {
      console.log("Failed to cleanup old game: ", e);
    }
  }
} catch (e) {
  console.warn("Failed to fetch and parse node utxos: ", e);
  throw e;
}

// Log a new game or player joined transaction if we see it
hydra.onTxSeen = () => {
  timeout = 60_000;
};
hydra.onNewGame = async (newGameId, humanCount, botCount, ephemeralKey) => {
  console.log(
    `Observed new game: ${newGameId} with ${humanCount} human players and ${botCount} bots, by ${ephemeralKey}`,
  );
  gameId = newGameId;
  expectedHumans = humanCount;
  expectedBots = botCount;
  // The first actor to connect will always be this process
  actors.push(keys.publicKeyHashHex);
  // then the player who starts the game is expected to connect
  actors.push(ephemeralKey);
  // If there's at least one ai, this process will serve as the first player
  if (expectedBots > 0) {
    players.push(keys.publicKeyHashHex);
    isHuman.push(false);
  }
  // and then the player who started the game
  players.push(ephemeralKey);
  isHuman.push(true);
  await sendEvent(gameId, {
    type: "new_game",
    game_id: gameId,
    humans: humanCount,
    bots: botCount,
  });
  await sendEvent(gameId, {
    type: "player_joined",
    game_id: gameId,
    key: ephemeralKey,
  });
};
hydra.onPlayerJoin = async (gameId, ephemeralKeys) => {
  const newPlayer = ephemeralKeys[ephemeralKeys.length - 1];
  console.log(`Observed player join for game ${gameId}, ${newPlayer}`);
  actors.push(newPlayer);
  players.push(newPlayer);
  isHuman.push(true);
  await sendEvent(gameId, {
    type: "player_joined",
    game_id: gameId,
    key: newPlayer,
  });
};

// Wait until the game starts
while (!gameId) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

const args = [
  "-server",
  "-altdeath",
  "-iwad",
  "freedoom2.wad",
  "-merge",
  "dm_iog.wad",
  "iog_assets.wad",
  expectedBots > 0 ? "-ai" : "-drone",
  "-nodes",
  (expectedHumans + expectedBots).toString(),
  "-nodraw",
  "-nomouse",
  "-nograbmouse",
  "-nogui",
  "-nomusic",
  "-nosound",
  "-config",
  "default.cfg",
];
try {
  module.callMain(args);
} catch (e) {
  console.error(e);
}

try {
  console.log("Server started.");
  await fetch("http://localhost:8000/start_server", { method: "POST" });
} catch (e) {
  console.warn("Failed to record server start: ", e);
}

while (!done) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  timeout -= 1000;
  if (timeout <= 0) {
    console.log("Game timed out.");
    done = true;
  }
}

console.log("Game finished.");
try {
  console.log("Ending game. Marking game as 'Aborted'.");
  await fetch("http://localhost:8000/game/end_game", {
    method: "POST",
  });
} catch (e) {
  console.warn("Failed to mark game as ended: ", e);
}
try {
  await Promise.all([
    fetch("http://localhost:8000/end_game", { method: "POST" }),
    sendEvent(gameId, { type: "game_finished" }),
  ]);
} catch (e) {
  console.warn("Failed to record game finished: ", e);
}

process.exit(0);
