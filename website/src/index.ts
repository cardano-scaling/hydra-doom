import { hydraRecv, hydraSend } from "./hydra";
import { generatePooQrUri } from "./keys";
import "./osano.js";
import { startQueryingAPI } from "./stats";
import "./styles.css";

declare function callMain(args: string[]): void;

const startButton: HTMLButtonElement | null = document.querySelector("#start");
const qrContainer: HTMLElement | null = document.querySelector("#qr-container");
const buttonText: HTMLDataListElement | null =
  document.querySelector("#button-text");

// Stuff for POO
let qrCode = await generatePooQrUri();
console.log(qrCode);
let qrShown = false;

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
startButton?.addEventListener("click", () => {
  startGame();
});

function showQrCode() {
  qrShown = true;

  const img = document.createElement("img");
  img.src = qrCode!;
  qrContainer?.appendChild(img);

  // We can add polling here and hide the button, but for now we'll just let the user click the button again
  if (buttonText) {
    buttonText.innerText = "Start Game";
  }
}

function startGame() {
  callMain(commonArgs.concat(["-hydra-send"]));

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
}
startQueryingAPI();
