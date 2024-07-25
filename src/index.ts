import { hydraRecv, hydraSend } from "./hydra";
import { startQueryingAPI } from "./stats";
import "./styles.css";

declare function callMain(args: string[]): void;

// Glue together callbacks available from doom-wasm
(window as any).hydraSend = hydraSend;
(window as any).hydraRecv = hydraRecv;

// Start a new game
const startButton: HTMLButtonElement | null = document.querySelector("#start");
startButton?.addEventListener("click", () => {
  // Hide the button
  if (startButton) {
    startButton.style.display = "none";
  }
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

startQueryingAPI();
