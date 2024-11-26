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
global.HydraMultiplayer = new HydraMultiplayerServer({
  key: keys,
  address: keys.address,
  url: HYDRA_NODE,
  module,
});

let playerCount = 0;
global.gameStarted = async () => {
  console.log(`Game started with ${playerCount} players`);

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
      sendEvent("a0", { type: "game_started", game_id: "a0", keys: [] }),
    ]);
  } catch (e) {
    console.warn("Failed to record game start: ", e);
  }
};
global.playerConnected = async () => {
  playerCount++;
  console.log(`Player joined, now ${playerCount} players`);
  if (!RECORD_STATS) return;
  try {
    // NOTE: We ignore ourselves for now, so the game doesn't enter "lobby" prematurely
    if (playerCount > 1) {
      await fetch("http://localhost:8000/player_joined", { method: "POST" });
    }
  } catch (e) {
    console.warn("Failed to record player joined: ", e);
  }
};
global.playerDisconnected = async () => {
  playerCount--;
  console.log(`Player left, now ${playerCount} players`);
  if (playerCount === 1) {
    // We're the last player, so quit
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
  console.log(`Player ${killer} killed ${victim}`);
  if (!RECORD_STATS) return;
  // TODO: map from player idx to ephemeral key
  // TODO: ddz leaderboards
  try {
    await Promise.all([
      fetch("http://localhost:8000/player_killed", { method: "POST" }),
      sendEvent("a0", {
        type: "kill",
        game_id: "a0",
        killer: "addr1abc",
        victim: "addr1def",
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
      sendEvent("a0", {
        type: "kill",
        game_id: "a0",
        killer: "addr1def",
        victim: "addr1def",
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
      await fetch("http://localhost:8080/game/cleanup", {
        method: "POST",
      });
    } catch (e) {
      console.log("Failed to cleanup old game: ", e);
    }
  }
} catch (e) {
  console.warn("Failed to fetch and parse node utxos: ", e);
}

const args = [
  "-server",
  "-altdeath",
  "-iwad",
  "freedoom2.wad",
  "-merge",
  "dm_iog.wad",
  "iog_assets.wad",
  "-ai",
  "-extratics",
  "1",
  "-nodes",
  "2",
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
}

console.log("Game finished.");
try {
  console.log("Ending game. Marking game as 'Aborted'.");
  await fetch("http://localhost:8080/game/end_game", {
    method: "POST",
  });
} catch (e) {
  console.warn("Failed to mark game as ended: ", e);
}
try {
  await Promise.all([
    fetch("http://localhost:8000/end_game", { method: "POST" }),
    sendEvent("a0", { type: "game_finished", game_id: "a0" }),
  ]);
} catch (e) {
  console.warn("Failed to record game finished: ", e);
}

process.exit(0);
