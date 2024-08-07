import { fetchNewGame, hydraRecv, hydraSend } from "./hydra";
import { generatePooQrUri, keys } from "./keys";
import "./osano.js";
import { startQueryingAPI } from "./stats";
import "./styles.css";

declare function callMain(args: string[]): void;

const startButton: HTMLButtonElement | null = document.querySelector("#start");
const qrContainer: HTMLElement | null = document.querySelector("#qr-container");
const skipButton: HTMLElement | null = document.querySelector("#skip-button");
const qrCodeWrapper: HTMLElement | null = document.querySelector("#qr-code");
const canvas: HTMLElement | null = document.querySelector("#canvas");

// Stuff for POO
const { sessionPk } = keys;
let qrCode = await generatePooQrUri();
let qrShown = false;

function hideQrAndShowCanvas() {
  if (qrCodeWrapper) {
    qrCodeWrapper.style.display = "none";
  }
  if (canvas) {
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.position = "static";
  }
}

async function pollForPoo(ephemeralKey: string) {
  const request = await fetch(`https://auth.hydradoom.fun/v1/${ephemeralKey}`);
  const status = request.status;
  if (status === 401) {
    throw new Error("Invalid Key");
  }
  if (status === 200) {
    hideQrAndShowCanvas();
    startGame();
    return;
  }

  setTimeout(() => pollForPoo(ephemeralKey), 5000);
}
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
startButton?.addEventListener("click", async () => {
  !!qrCode && !qrShown ? await showQrCode() : await startGame();
});

// Skip QR code
skipButton?.addEventListener("click", () => {
  hideQrAndShowCanvas();
  startGame();
});

async function showQrCode() {
  qrShown = true;

  const img = document.createElement("img");
  img.src = qrCode!;
  qrContainer?.appendChild(img);
  if (startButton) startButton.style.display = "none";
  await pollForPoo(sessionPk);
}

async function startGame() {
  await fetchNewGame();
  if (startButton) {
    startButton.style.display = "none";
  }
  callMain(commonArgs.concat(["-hydra-send"]));
}

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
