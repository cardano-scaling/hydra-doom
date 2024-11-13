// Run as a node process to run a dedicated doom server

import { HydraMultiplayer } from "utils/hydra-multiplayer";
import { Lucid, toHex } from "lucid-cardano";
import * as bech32 from "bech32-buffer";
import * as ed25519 from "@noble/ed25519";
import { blake2b } from "@noble/hashes/blake2b";

let done = false;

// TODO: read key from k8s secret / local file
const lucid = await Lucid.new(undefined, "Preprod");
const key =
  "ed25519_sk13ergqg9vy7rj6h4v05yf4v2ltctxml5ua9kxvc04ph8hjvs3m3hs9gsn2x";
const privateKeyBytes = bech32.decode(key).data;
const publicKeyBytes = await ed25519.getPublicKeyAsync(privateKeyBytes);
const publicKeyHashBytes = blake2b(publicKeyBytes, { dkLen: 224 / 8 });
const publicKeyHashHex = toHex(publicKeyHashBytes);
const keys = {
  sessionKeyBech32: key,
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
    console.log(scripts + "public/" + path);
    return scripts + "public/" + path;
  },
  noInitialRun: true,
  preRun: function (mod: any) {
    const files = ["freedoom2.wad", "default.cfg", "Cardano.wad"];
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
global.HydraMultiplayer = new HydraMultiplayer(
  keys,
  "http://localhost:4001",
  module,
);

global.gameStarted = () => {
  // TODO: Hit localhost to record game start
};
global.playerConnected = () => {
  // TODO: Hit localhost to record a player joined
  // NOTE: might need to ignore ourselves joining, so we don't inflate the player metrics
};
global.playerDisconnected = () => {
  // TODO: Hit localhost to record a player disconnected
};
global.kill = (_killer, _victim) => {
  // TODO: map from player idx to ephemeral key
  // TODO: Hit localhost to record a kill
};
global.suicide = (_player) => {
  // TODO: Hit localhist to record a kill
};

// TODO: check for a pending game and run cleanup

const args = [
  "-server",
  "-deathmatch",
  "-iwad",
  "freedoom2.wad",
  "-file",
  "Cardano.wad",
  "-drone",
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

// TODO: hit localhost to record the server is online

while (!done) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

// TODO: record the game as ended
// TODO: also decrement metrics by the number of players?

process.exit(0);
