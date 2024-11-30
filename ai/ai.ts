// Run as a node process to run an AI agent

import { HydraMultiplayerClient } from "utils/HydraMultiplayer/client";
import { Lucid, toHex, fromHex } from "lucid-cardano";
import * as bech32 from "bech32-buffer";
import * as ed25519 from "@noble/ed25519";
import { blake2b } from "@noble/hashes/blake2b";
import { readFile } from "node:fs/promises";

const NETWORK_ID = Number(process.env.NETWORK_ID);
const HYDRA_NODE = "http://localhost:4001/";
const bot_index = Number(process.env.BOT_INDEX ?? 1);

let done = false;
const lucid = await Lucid.new(
  undefined,
  NETWORK_ID === 1 ? "Mainnet" : "Preprod",
);

const adminKeyFile = process.env.ADMIN_KEY_FILE ?? "admin.sk";
const adminKey = JSON.parse((await readFile(adminKeyFile)).toString());
const adminPrivateKeyBytes = adminKey.cborHex.slice(4);

const adminPublicKeyBytes =
  await ed25519.getPublicKeyAsync(adminPrivateKeyBytes);
const adminPublicKeyHashBytes = blake2b(adminPublicKeyBytes, {
  dkLen: 224 / 8,
});
const adminPublicKeyHashHex = toHex(adminPublicKeyHashBytes);

const sessionKeyBech32 = lucid.utils.generatePrivateKey();
const privateKeyBytes = bech32.decode(sessionKeyBech32).data;

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
console.log(`Bot ${bot_index} Address: ${keys.address}`);

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
      "iog_assets.wad",
      "dm_iog.wad",
    ];
    files.forEach((file) => {
      mod.FS!.createPreloadedFile("/", file, "../public/" + file, true, true);
    });
  },
  canvas: null as any,
  print: (text: string) => {
    // Silencing prints for now
  },
  printErr: (text: string) => {
    // Leaving error messages
    console.error("stderr:", text);
  },
  onExit: () => {
    console.log("Game exited");
    done = true;
  },
});

global.Module = module;
const hydra = new HydraMultiplayerClient({
  key: keys,
  adminPkh: adminPublicKeyHashHex,
  url: "http://localhost:4001",
  module: module,
  networkId: NETWORK_ID,
});
global.HydraMultiplayer = hydra;

let shouldPlay = false;

hydra.onNewGame = async (newGameId, _humanCount, botCount, _ephemeralKey) => {
  if (botCount > bot_index) {
    console.log(`Bot ${bot_index} joining game ${newGameId}`);
    shouldPlay = true;
  }
};
let timeout = 10_000;
hydra.onTxSeen = async (tx) => {
  timeout = 10_000;
};

while (!shouldPlay) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

await fetch(`http://localhost:8000/game/add_player?address=${keys.address}`);

// TODO: generate a fun pet name
const args = [
  "-connect",
  "1",
  "-altdeath",
  "-ai",
  "-iwad",
  "freedoom2.wad",
  "-merge",
  "dm_iog.wad",
  "iog_assets.wad",
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
  console.log("Attemping to join the game");
  module.callMain(args);
} catch (e) {
  console.error(e);
}

while (!done) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  timeout -= 1000;
  if (timeout <= 0) {
    done = true;
  }
}

process.exit(0);
