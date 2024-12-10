// Run as a node process to run a referee doom server

import { readFile } from "node:fs/promises";
import { HydraMultiplayerDedicated } from "utils/HydraMultiplayer/dedicated";
import { Core } from "@blaze-cardano/sdk";
import * as bech32 from "bech32-buffer";
import * as ed25519 from "@noble/ed25519";
import { blake2b } from "@noble/hashes/blake2b";
import { KinesisClient, PutRecordsCommand } from "@aws-sdk/client-kinesis";
import { Packet } from "utils/HydraMultiplayer/base.js";
import { fromHex, toHex } from "utils/helpers.js";

const NETWORK_ID = Number(process.env.NETWORK_ID);
const HYDRA_NODE = "http://localhost:4001/";
const DISCORD_BOT = "http://localhost:8080/"; // TODO
const RECORD_STATS = true;

const kinesis = new KinesisClient({
  region: "us-east-1",
});
const encoder = new TextEncoder();

async function sendEvent(gameId, data) {
  const event_id = `${gameId}-${crypto.randomUUID()}`;
  const dataRaw = encoder.encode(
    JSON.stringify({
      event_id,
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
  for (let i = 0; i < 3; i++) {
    try {
      await kinesis.send(command);
      return;
    } catch (e) {
      console.warn("Failed to send event, retrying: ", e);
    }
  }
}

async function reportResults(gameId, results) {
  console.log(`Reporting results for game ${gameId}\n`, JSON.stringify(results, null, 2));
  for(let i = 0; i < 5; i++) {
    try {
      let resp = await fetch(DISCORD_BOT, {
        method: "POST",
        body: JSON.stringify(results),
      })
      if (resp.status !== 200) {
        throw new Error(resp.statusText + ": " + await resp.text());
      } else {
        break;
      }
    } catch(e) {
      console.warn("Failed to report results, retrying: ", e);
    }
  }
}

let done = false;
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
  address: Core.addressFromCredential(
    NETWORK_ID === 1 ? Core.NetworkId.Mainnet : Core.NetworkId.Testnet,
    Core.Credential.fromCore({
      hash: Core.Hash28ByteBase16(publicKeyHashHex),
      type: Core.CredentialType.KeyHash,
    }),
  ).toBech32(),
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

const hydra = new HydraMultiplayerDedicated({
  key: keys,
  address: keys.address,
  url: HYDRA_NODE,
  module,
  networkId: NETWORK_ID,
});
global.HydraMultiplayer = hydra;

let expectedHumans = 0;
let gameId = "";
type Player = {
  ephemeralKey: string;
  playerNumber: number;
  connected: boolean;
};
const players: { [addr: number]: Player } = {};

global.gameStarted = async () => {
  const connectedPlayers = Object.values(players)
    .filter((p) => p.connected)
    .map((p) => p.ephemeralKey);
  console.log(
    `Game started with ${connectedPlayers.length} connected players or bots`,
  );

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
        keys: connectedPlayers,
      }),
    ]);
  } catch (e) {
    console.warn("Failed to record game start: ", e);
  }
};

global.playerConnected = async (addr: number, player: number) => {
  if (players[addr]?.connected) {
    console.log(
      `Duplicate connection from ${addr} / ${players[addr].playerNumber} / ${players[addr].ephemeralKey}?`,
    );
    return;
  }
  players[addr].playerNumber = player;
  players[addr].connected = true;
  const playerCount = Object.values(players).filter((p) => p.connected).length;
  console.log(
    `Player joined ${addr} with ephemeral key ${players[addr].ephemeralKey}, now ${playerCount} connected actors`,
  );
  if (!RECORD_STATS) return;
  try {
    await fetch("http://localhost:8000/player_joined", { method: "POST" });
  } catch (e) {
    console.warn("Failed to record player joined: ", e);
  }
};
global.playerDisconnected = async (addr: number, player: number) => {
  console.log(`Someone disconnected, ending the game`);
  done = true;
  if (!RECORD_STATS) return;
  try {
    await fetch("http://localhost:8000/player_left", { method: "POST" });
  } catch (e) {
    console.warn("Failed to record player left: ", e);
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
let timeout = 60_000;
let timer = 15 * 60 * 1000; // 15 minute timer
hydra.onTxSeen = () => {
  timeout = 60_000;
};
// Hacky :skull:
const originalOnPacket = hydra.onPacket;
hydra.onPacket = (_tx: any, packet: Packet) => {
  originalOnPacket(_tx, packet);
  if (!players[packet.from]) {
    console.log(
      `Saw a new packet from ${packet.from} with ephemeral key ${toHex(packet.ephemeralKey)}`,
    );
    players[packet.from] = {
      ephemeralKey: toHex(packet.ephemeralKey),
      connected: false,
      playerNumber: -1,
    };
  }
};
hydra.onNewGame = async (newGameId, humanCount, _botCount, ephemeralKey) => {
  console.log(
    `Observed new game: ${newGameId}, by ${ephemeralKey}`,
  );
  gameId = newGameId;
  expectedHumans = humanCount;
  await sendEvent(gameId, {
    type: "new_game",
    game_id: gameId,
    humans: humanCount,
    bots: 0,
    is_elimination: true,
  });
};
hydra.onPlayerJoin = async (gameId, ephemeralKeys) => {
  if (done) {
    console.log("Game is already done, ignoring player join");
    return;
  }
  const newPlayer = ephemeralKeys[ephemeralKeys.length - 1];
  console.log(`Observed player join for game ${gameId}, ${newPlayer}`);
  await sendEvent(gameId, {
    type: "player_joined",
    game_id: gameId,
    key: newPlayer,
    is_elimination: true,
  });
};
hydra.onDisagreement = async () => {
  // TODO: cleanup game state
  await reportResults(gameId, {
    gameId: gameId,
    result: "disagreement",
  })
};

// Mark us as waiting for a new game
try {
  console.log("Server started.");
  await fetch("http://localhost:8000/start_server", { method: "POST" });
} catch (e) {
  console.warn("Failed to record server start: ", e);
}

// Wait until the game starts
while (!gameId) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

const args = [
  "-dedicated",
  "-nodes",
  expectedHumans.toString(),
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

while (!done) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  timeout -= 1000;
  timer -= 0;
  if (timer <= 0) {
    console.log("Game ended.");
    done = true;
    await reportResults(gameId, {
      gameId: gameId,
      result: "finished",
      playerOne: {
        pkh: Object.values(players).find(p => p.playerNumber === 0)?.ephemeralKey,
        kills: hydra.clients[0].kills,
      },
      playerTwo: {
        pkh: Object.values(players).find(p => p.playerNumber === 1)?.ephemeralKey,
        kills: hydra.clients[1].kills,
      }
    });
  }
  if (timeout <= 0) {
    console.log("Game timed out.");
    done = true;
    await reportResults(gameId, {
      gameId: gameId,
      result: "timeout",
    });
  }
}

try {
  await Promise.all([
    fetch("http://localhost:8000/end_game", { method: "POST" }),
    sendEvent(gameId, {
      type: "game_finished",
      game_id: gameId,
      is_elimination: true,
    }),
  ]);
} catch (e) {
  console.warn("Failed to record game finished: ", e);
}

process.exit(0);
