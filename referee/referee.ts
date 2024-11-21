// Run as a node process to run a referee doom server

import { readFile } from "node:fs/promises";
import { HydraMultiplayerServer } from "utils/HydraMultiplayer/server";
import { Lucid, toHex, fromHex } from "lucid-cardano";
import * as bech32 from "bech32-buffer";
import * as ed25519 from "@noble/ed25519";
import { blake2b } from "@noble/hashes/blake2b";

const HYDRA_NODE = "https://a0.us-east-1.hydra-doom.sundae.fi/";
const RECORD_STATS = true;
const API_KEY = process.env.API_KEY;

let done = false;
const lucid = await Lucid.new(undefined, "Preprod");
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
const hydraServer = new HydraMultiplayerServer({
  key: keys,
  address: keys.address,
  url: HYDRA_NODE,
  module,
});
global.HydraMultiplayer = hydraServer;

let playerCount = 0;
global.gameStarted = async () => {
  console.log(`Game started with ${playerCount} players`);

  console.log("Updating game state to 'Running'.");
  try {
    await fetch("http://api.us-east-1.hydra-doom.sundae.fi/start_game?id=a0", {
      method: "POST",
      headers: {
        Authorization: API_KEY,
      },
    });
  } catch (e) {
    console.warn("Failed to update game state to 'Running': ", e);
  }
  if (!RECORD_STATS) return;
  try {
    await fetch("http://localhost:8000/start_game", { method: "POST" });
  } catch (e) {
    console.warn("Failed to record game start: ", e);
  }
};
global.playerConnected = async () => {
  playerCount++;
  console.log(`Player joined, now ${playerCount} players`);
  if (!RECORD_STATS) return;
  // NOTE: might need to ignore ourselves joining, so we don't inflate the player metrics
  try {
    await fetch("http://localhost:8000/player_joined", { method: "POST" });
  } catch (e) {
    console.warn("Failed to record player joined: ", e);
  }
};
global.playerDisconnected = async () => {
  playerCount--;
  console.log(`Player left, now ${playerCount} players`);
  if (!RECORD_STATS) return;
  try {
    await fetch("http://localhost:8000/player_left", { method: "POST" });
  } catch (e) {
    console.warn("Failed to record player left: ", e);
  }
  // TODO: Hit localhost to record a player disconnected
};
global.kill = async (killer, victim) => {
  console.log(`Player ${killer} killed ${victim}`);
  if (!RECORD_STATS) return;
  // TODO: map from player idx to ephemeral key
  // TODO: ddz leaderboards
  try {
    await fetch("http://localhost:8000/player_killed", { method: "POST" });
  } catch (e) {
    console.warn("Failed to record a kill: ", e);
  }
};
global.suicide = async (player) => {
  console.log(`Player ${player} suicided`);
  if (!RECORD_STATS) return;
  try {
    await fetch("http://localhost:8000/player_suicided", { method: "POST" });
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
      await fetch("http://api.us-east-1.hydra-doom.sundae.fi/cleanup?id=a0", {
        method: "POST",
        headers: {
          Authorization: API_KEY,
        },
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
  "-deathmatch",
  "-iwad",
  "freedoom2.wad",
  "-merge",
  "dm_iog.wad",
  "iog_assets.wad",
  "-ai",
  "-ticdup",
  "2",
  "-nodes",
  "4",
  "-timer",
  "5",
  "-nodraw",
  "-nomouse",
  "-nograbmouse",
  "-nogui",
  "-nomusic",
  "-nosound",
  "-config",
  "default.cfg",
];
// try {
//   module.callMain(args);
// } catch (e) {
//   console.error(e);
// }

while (true) {
  if (!hydraServer.hydra.isConnected()) {
    continue;
  }
  // According to https://www.doomworld.com/forum/topic/99810-how-much-data-does-online-dming-consume/ assumptions, the network packet is about 6 bytes
  await hydraServer.SendPacket(0, 0, new Uint8Array([0, 0, 0, 0, 0, 0]));
  await new Promise((resolve) => setTimeout(resolve, 1));
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
  await fetch("http://api.us-east-1.hydra-doom.sundae.fi/end_game?id=a0", {
    method: "POST",
    headers: {
      Authorization: API_KEY,
    },
  });
} catch (e) {
  console.warn("Failed to mark game as ended: ", e);
}
try {
  await fetch("http://localhost:8000/end_game", { method: "POST" });
} catch (e) {
  console.warn("Failed to record game finished: ", e);
}

process.exit(0);
