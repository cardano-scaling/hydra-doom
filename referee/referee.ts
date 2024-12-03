// Run as a node process to run a referee doom server

import { readFile } from "node:fs/promises";
import { HydraMultiplayerServer } from "utils/HydraMultiplayer/server";
import { Core } from "@blaze-cardano/sdk";
import * as bech32 from "bech32-buffer";
import * as ed25519 from "@noble/ed25519";
import { blake2b } from "@noble/hashes/blake2b";
import { KinesisClient, PutRecordsCommand } from "@aws-sdk/client-kinesis";
import { Packet } from "utils/HydraMultiplayer/base.js";
import { fromHex, toHex } from "utils/helpers.js";

const NETWORK_ID = Number(process.env.NETWORK_ID);
const HYDRA_NODE = "http://localhost:4001/";
const RECORD_STATS = true;

const kinesis = new KinesisClient({ region: "us-east-1" }); // TODO: env variable?
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

let done = false;
// const lucid = await Lucid.new(
//   undefined,
//   NETWORK_ID === 1 ? "Mainnet" : "Preprod",
// );
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
let isQualifier = false;
let timeout = 60_000;
let gameId = "";
type Player = {
  ephemeralKey: string;
  playerNumber: number;
  connected: boolean;
};
const players: { [addr: number]: Player } = {};
// Prepopulate with the server, since we don't send out syn packets
players[1] = {
  ephemeralKey: keys.publicKeyHashHex,
  connected: false,
  playerNumber: -1,
};

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
global.kill = async (killer, victim) => {
  let killerPlayer: Player, victimPlayer: Player;
  for (const player of Object.values(players)) {
    if (player.playerNumber === killer) {
      killerPlayer = player;
    }
    if (player.playerNumber === victim) {
      victimPlayer = player;
    }
  }
  console.log(
    `${killerPlayer.ephemeralKey} killed ${victimPlayer.ephemeralKey}`,
  );
  if (!RECORD_STATS) return;
  try {
    await Promise.all([
      fetch("http://localhost:8000/player_killed", { method: "POST" }),
      sendEvent(gameId, {
        type: "kill",
        game_id: gameId,
        killer: killerPlayer.ephemeralKey,
        victim: victimPlayer.ephemeralKey,
        is_qualifier: isQualifier,
      }),
    ]);
  } catch (e) {
    console.warn("Failed to record a kill: ", e);
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
hydra.onPacket = (_tx: any, packet: Packet) => {
  if (!players[packet.from]) {
    console.log(
      `Saw a new packet from ${packet.from} with ephemeral key ${packet.ephemeralKey}`,
    );
    players[packet.from] = {
      ephemeralKey: toHex(packet.ephemeralKey),
      connected: false,
      playerNumber: -1,
    };
  }
};
hydra.onNewGame = async (newGameId, humanCount, botCount, ephemeralKey) => {
  console.log(
    `Observed new game: ${newGameId} with ${humanCount} human players and ${botCount} bots, by ${ephemeralKey}`,
  );
  gameId = newGameId;
  expectedHumans = humanCount;
  expectedBots = botCount;
  const tournamentOpen = 1733238000000; // Dec 3, 2024, 3pm GMT
  isQualifier =
    new Date().valueOf() > tournamentOpen && humanCount === 1 && botCount > 0;
  await sendEvent(gameId, {
    type: "new_game",
    game_id: gameId,
    humans: humanCount,
    bots: botCount,
    is_qualifier: isQualifier,
  });
  if (botCount > 0) {
    // TODO: should we have the referee call join_game?
    await sendEvent(gameId, {
      type: "player_joined",
      game_id: gameId,
      key: keys.publicKeyHashHex,
      is_qualifier: isQualifier,
    });
  }
  if (humanCount > 0) {
    await sendEvent(gameId, {
      type: "player_joined",
      game_id: gameId,
      key: ephemeralKey,
      is_qualifier: isQualifier,
    });
  }
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
    is_qualifier: isQualifier,
  });
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
    sendEvent(gameId, {
      type: "game_finished",
      game_id: gameId,
      is_qualifier: isQualifier,
    }),
  ]);
} catch (e) {
  console.warn("Failed to record game finished: ", e);
}

process.exit(0);
