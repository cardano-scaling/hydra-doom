import { hydraRecv, hydraSend } from "./hydra";
import "./styles.css";

declare var Module: any;
declare function callMain(args: string[]): void;

// Glue together callbacks available from doom-wasm

const startButton: HTMLButtonElement | null = document.querySelector("#start");
const txPerSecond: HTMLDataListElement | null = document.querySelector("#txps");
const bytesPerSecond: HTMLDataListElement | null =
  document.querySelector("#bps");
console.log({ txPerSecond, bytesPerSecond });

startButton?.addEventListener("click", () => {
  // Hide the button
  if (startButton) {
    startButton.style.display = "none";
  }

  Module.hydraSend = hydraSend;
  Module.hydraRecv = hydraRecv;
  (window as any).hydraSend = hydraSend;
  (window as any).hydraRecv = hydraRecv;
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
