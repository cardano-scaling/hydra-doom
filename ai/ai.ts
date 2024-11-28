// Run as a node process to run an AI agent

import { HydraMultiplayerClient } from "utils/HydraMultiplayer/client";
import { Lucid, toHex, fromHex } from "lucid-cardano";
import * as bech32 from "bech32-buffer";
import * as ed25519 from "@noble/ed25519";
import { blake2b } from "@noble/hashes/blake2b";
import { readFile } from "fs/promises";

const NETWORK_ID = Number(process.env.NETWORK_ID);
// TODO: support multiple bots
const HYDRA_NODE = "http://localhost:4001/";
const bot_index = 0;

// Get adminPkh
const adminKeyFile = process.env.ADMIN_KEY_FILE ?? "admin.sk";
const adminKey = JSON.parse((await readFile(adminKeyFile)).toString());
const privateAdminKeyBytes = adminKey.cborHex.slice(4);
const publicAdminKeyBytes =
  await ed25519.getPublicKeyAsync(privateAdminKeyBytes);
const publicAdminKeyHashBytes = blake2b(publicAdminKeyBytes, {
  dkLen: 224 / 8,
});
const adminPkh = toHex(publicAdminKeyHashBytes);

// Wait until we see a player join
// TODO: make this more robust? check if we are actually supposed to join?
while (true) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const response = await fetch(`${HYDRA_NODE}snapshot/utxo`);
  const data = await response.json();
  if (Object.keys(data).length > 1) {
    break;
  }
}

// TODO: should we generate this key, like the UI does? no reason we need to keep it around
let done = false;
const lucid = await Lucid.new(
  undefined,
  NETWORK_ID === 1 ? "Mainnet" : "Preprod",
);

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
global.HydraMultiplayer = new HydraMultiplayerClient({
  key: keys,
  adminPkh: adminPkh,
  url: "http://localhost:4001",
  module: module,
  networkId: NETWORK_ID,
});

// TODO: modify new-game transaction to record # of players
// TODO: watch for new-game transaction to decide if we're participating in this game

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
}

process.exit(0);
