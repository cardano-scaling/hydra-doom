import { hydraSend, hydraRecv } from "./hydra";
declare var Module: any;
declare function callMain(args: string[]): void;

// Glue together callbacks available from doom-wasm

const startButton: HTMLButtonElement | null = document.querySelector("#start");

// TODO: this is flaky and not always happens (in time?)
Module.onRuntimeInitialized = () => {
  console.log("WASM module loaded");

  Module.hydraSend = hydraSend;
  Module.hydraRecv = hydraRecv;

  if (startButton) {
    startButton.disabled = false;
  }
};

// For some reason, injecting into Module doesn't work but this does?
// @ts-ignore
window.hydraSend = hydraSend;
// @ts-ignore
window.hydraRecv = hydraRecv;
startButton!.disabled = false;

startButton?.addEventListener("click", () => {
  var args = [
    "-iwad",
    "doom1.wad",
    "-window",
    "-nogui",
    "-nomusic",
    "-config",
    "default.cfg",
  ];
  callMain(args);
});
