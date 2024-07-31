import { hydraSend, hydraRecv } from "./hydra";
import { startQueryingAPI } from "./stats";
import "./styles.css";

declare function callMain(args: string[]): void;

// Glue together callbacks available from doom-wasm
(window as any).hydraSend = hydraSend;
(window as any).hydraRecv = hydraRecv;

const commonArgs = [
  "-iwad",
  "doom1.wad",
  "-window",
  "-nogui",
  "-nomusic",
  "-config",
  "default.cfg",
];

// Start a new game
const startButton: HTMLButtonElement | null = document.querySelector("#start");
startButton?.addEventListener("click", () => {
  // Hide the button
  if (startButton) {
    startButton.style.display = "none";
  }
  callMain(commonArgs.concat(["-hydra-send"]));
});

// Watch game
// FIXME: prevent /new_game in hydra.ts
const params = new URLSearchParams(window.location.search);
if (params.get("watch") != null) {
  // Hide the button
  if (startButton) {
    startButton.style.display = "none";
  }
  setTimeout(() => {
    callMain(commonArgs.concat("-hydra-recv"));
  }, 1000);
}

startQueryingAPI();
