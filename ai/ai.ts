// Run as a node process to run an AI agent

import { HydraMultiplayerClient } from "utils/HydraMultiplayer/client";
import * as bech32 from "bech32-buffer";
import { Core } from "@blaze-cardano/sdk";
import * as ed25519 from "@noble/ed25519";
import { blake2b } from "@noble/hashes/blake2b";
import { readFile } from "node:fs/promises";
import { fromHex, toHex } from "utils/helpers.js";

const NETWORK_ID = Number(process.env.NETWORK_ID);
const HYDRA_NODE = "http://localhost:4001/";
const bot_index = Number(process.env.BOT_INDEX ?? 1);

let done = false;

const adminKeyFile = "bob";
const adminKey = JSON.parse((await readFile(adminKeyFile)).toString());
const adminPrivateKeyBytes = adminKey.cborHex.slice(4);

const adminPublicKeyBytes =
  await ed25519.getPublicKeyAsync(adminPrivateKeyBytes);
const adminPublicKeyHashBytes = blake2b(adminPublicKeyBytes, {
  dkLen: 224 / 8,
});
const adminPublicKeyHashHex = toHex(adminPublicKeyHashBytes);

const privateKeyBytes = ed25519.utils.randomPrivateKey();

const publicKeyBytes = await ed25519.getPublicKeyAsync(privateKeyBytes);
const publicKeyHashBytes = blake2b(publicKeyBytes, { dkLen: 224 / 8 });
const publicKeyHashHex = toHex(publicKeyHashBytes);
const keys = {
  privateKeyBytes,
  privateKeyHex: toHex(privateKeyBytes),
  publicKeyBytes,
  publicKeyHex: toHex(publicKeyBytes),
  publicKeyHashBytes,
  publicKeyHashHex,
  address: Core.addressFromCredential(
    NETWORK_ID === 1 ? Core.NetworkId.Mainnet : Core.NetworkId.Testnet,
    Core.Credential.fromCore({
      type: Core.CredentialType.KeyHash,
      hash: Core.Hash28ByteBase16(publicKeyHashHex),
    }),
  ).toBech32(),
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
console.log("Waiting 1.5s for hydra connection");
await Promise.resolve((resolve) => setTimeout(resolve, 15000));
console.log("Done waiting");
let timeout = 10_000;
hydra.onTxSeen = async (tx) => {
  timeout = 10_000;
};

// await fetch(`http://localhost:8000/game/add_player?address=${keys.address}`);

// TODO: generate a fun pet name
const args = [
  "-server",
  "-nodes",
  "2",
  "-ai",
  "-altdeath",
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
  console.log("Attempting to start game");
  module.callMain(args);
} catch (e) {
  console.error(e);
}

while (true) {
  console.log("Running...");
  await Promise.resolve((resolve) => setTimeout(resolve, 1000));
}
