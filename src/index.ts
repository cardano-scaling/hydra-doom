import { fetchNewGame, hydraRecv, hydraSend } from "./game";
import { generatePooQrUri, keys } from "./keys";
import "./osano.js";
import { startQueryingAPI } from "./stats";
import "./styles.css";

declare function callMain(args: string[]): void;

const startButton: HTMLButtonElement | null = document.querySelector("#start");
const qrContainer: HTMLElement | null = document.querySelector("#qr-container");
const skipButton: HTMLElement | null = document.querySelector("#skip-button");
const restartButton: HTMLElement | null =
  document.querySelector("#restart-button");
const qrCodeWrapper: HTMLElement | null = document.querySelector("#qr-code");
const canvas: HTMLElement | null = document.querySelector("#canvas");
const message: HTMLElement | null = document.querySelector("#message");
const loadingMessage: HTMLElement | null =
  document.querySelector("#loading-message");
const muteButton: HTMLButtonElement | null =
  document.querySelector("#mute-button");
const muteIcon: HTMLElement | null = document.querySelector("#mute-icon");

// Stuff for POO
const { sessionPk } = keys;
let qrCode = await generatePooQrUri();
let qrShown = false;

async function pollForPoo(ephemeralKey: string) {
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

// Array of MP3 file paths
const musicFiles = [
  "assets/music/blue-screen-of-death.mp3",
  "assets/music/demons-prowl.mp3",
  "assets/music/dooms-fate.mp3",
  "assets/music/mark-of-malice.mp3",
  "assets/music/unnamed.mp3",
];

function shuffleArray(array: string[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

let currentAudio: HTMLAudioElement | null = null;
let isMuted = false;

// Function to play music files in order and loop infinitely
function playMusic(files: string[]) {
  if (files.length === 0) return;

  let currentIndex = 0;

  function playNext() {
    if (currentAudio) {
      currentAudio.removeEventListener("ended", playNext);
    }

    currentAudio = new Audio(files[currentIndex]);
    currentAudio.play();

    currentAudio.addEventListener("ended", playNext);

    currentIndex = (currentIndex + 1) % files.length; // Loop back to the first song
  }

  playNext();

  if (isMuted && currentAudio) {
    currentAudio.muted = true;
  }

  // Show the mute button when the music starts
  if (muteButton) muteButton.style.display = "block";
}

// Mute/Unmute functionality
muteButton?.addEventListener("click", () => {
  isMuted = !isMuted;
  if (currentAudio) {
    currentAudio.muted = isMuted;
  }
  if (muteIcon) {
    muteIcon.className = isMuted ? "fas fa-volume-mute" : "fas fa-volume-up";
  }
});

// Start a new game
startButton?.addEventListener("click", async () => {
  !!qrCode && !qrShown ? await showQrCode() : await startGame();
});

// Skip QR code
skipButton?.addEventListener("click", () => {
  startGame();
});

// Restart game
restartButton?.addEventListener("click", () => {
  location.reload();
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
  if (startButton) {
    startButton.style.display = "none";
  }

  if (qrCodeWrapper) {
    qrCodeWrapper.style.display = "none";
  }

  if (loadingMessage) {
    loadingMessage.style.display = "flex";
  }

  try {
    await fetchNewGame();

    if (loadingMessage) loadingMessage.style.display = "none";

    if (canvas) {
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.position = "static";
    }

    // Shuffle and play music files
    shuffleArray(musicFiles);
    playMusic(musicFiles);
  } catch (error) {
    console.error(error);
    if (loadingMessage) loadingMessage.style.display = "none";
    if (message) message.style.display = "flex";
  }
  // hydra-recv is temporarily disabled so we can move around
  callMain(commonArgs.concat(["-hydra-send" /* "-hydra-recv" */]));
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
