import { hydraSend, hydraRecv, fetchNewGame } from "./hydra";
import { startQueryingAPI } from "./stats";
import "./styles.css";
import { generatePooQrUri, keys } from "./keys";

declare function callMain(args: string[]): void;

const startButton: HTMLButtonElement | null = document.querySelector("#start");
const txPerSecond: HTMLDataListElement | null = document.querySelector("#txps");
const bytesPerSecond: HTMLDataListElement | null =
  document.querySelector("#bps");
const qrContainer: HTMLElement | null = document.querySelector("#qr-container");

// Stuff for POO
const { sessionPk } = keys;
let qrCode = await generatePooQrUri();
let qrShown = false;
async function pollForPoo(ephemeralKey: string) {
  console.log(ephemeralKey);
  const request = await fetch(`https://auth.hydradoom.fun/v1/${ephemeralKey}`);
  const status = request.status;
  if (status === 401) {
    throw new Error("Invalid Key");
  }
  if (status === 200) {
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
  if (qrContainer) {
    qrContainer.style.display = "none";
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
