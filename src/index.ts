import { fetchNewGame, hydraRecv, hydraSend } from "./game";
import { generatePooQrUri, keys } from "./keys";
import "./osano.js";
import { startQueryingAPI, truncateString } from "./stats";
import "./styles.css";

declare function callMain(args: string[]): void;

const startButton: HTMLButtonElement | null = document.querySelector("#start");
const selectContinent: HTMLButtonElement | null =
  document.querySelector("#select-continent");
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
const continentForm: HTMLFormElement | null =
  document.querySelector("#continent-form");
const startGameButton: HTMLButtonElement | null =
  document.querySelector("#start-game-button");
const tabButtons = document.querySelectorAll(".js-tab-button");
const sessionPkhDisplay: HTMLElement | null = document.querySelector(
  "#session-pkh-display"
);

// Stuff for POO
const { sessionPkh } = keys;
let pollingInterval: any = undefined;
let qrCode = await generatePooQrUri();
let qrShown = false;

if (sessionPkhDisplay) {
  sessionPkhDisplay.textContent = `(${truncateString(sessionPkh, 7, 7)})`;
}

async function pollForPoo(ephemeralKeyHash: string) {
  const request = await fetch(`https://auth.hydradoom.fun/v1/${ephemeralKeyHash}`);
  const status = request.status;
  if (status === 401) {
    throw new Error("Invalid Key");
  }
  if (status === 200) {
    startGame();
    return;
  }

  pollingInterval = setTimeout(() => pollForPoo(ephemeralKeyHash), 5000);
}
// Glue together callbacks available from doom-wasm
(window as any).hydraSend = hydraSend;
(window as any).hydraRecv = hydraRecv;

if (process.env.CABINET_KEY) {
  document.querySelectorAll(".js-cabinet-logos").forEach((element) => {
    const e = element as HTMLElement | null;
    if (e) e.style.display = "block";
  });
}

if (process.env.REGION) {
  if (selectContinent) selectContinent.style.display = "none";
  startButton?.addEventListener("click", async () => {
    !!qrCode && !qrShown ? await showQrCode() : await startGame();
  });
} else {
  if (startButton) startButton.style.display = "none";
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const tab = button.getAttribute("data-tab");
    button.parentElement?.parentElement
      ?.querySelectorAll(".js-tab-content")
      .forEach((content) => {
        content.classList.remove("active");
      });
    button.parentElement?.parentElement
      ?.querySelectorAll(".js-tab-button")
      .forEach((content) => {
        content.classList.remove("active");
      });
    if (tab) {
      button.parentElement?.parentElement
        ?.querySelector(`#${tab}`)
        ?.classList.add("active");
    }
    if (tab) {
      button.parentElement
        ?.querySelector(`#tab-${tab}`)
        ?.classList.add("active");
    }
  });
});

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
let selectedContinent = "us-east-2";

// Load the mute state from local storage
const savedMuteState = localStorage.getItem("isMuted");
if (savedMuteState !== null) {
  isMuted = JSON.parse(savedMuteState);
  if (muteIcon) {
    muteIcon.className = isMuted ? "fas fa-volume-mute" : "fas fa-volume-up";
  }
}

// Function to play music files in order and loop infinitely
function playMusic(files: string[]) {
  if (files.length === 0) return;

  let currentIndex = 0;

  function playNext() {
    if (currentAudio) {
      currentAudio.removeEventListener("ended", playNext);
    }

    currentAudio = new Audio(files[currentIndex]);
    currentAudio.muted = isMuted;
    currentAudio.volume = 0.2;
    currentAudio.play();

    currentAudio.addEventListener("ended", playNext);

    currentIndex = (currentIndex + 1) % files.length; // Loop back to the first song
  }

  playNext();

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
  localStorage.setItem("isMuted", JSON.stringify(isMuted));
});

// Start game with selected continent
startGameButton?.addEventListener("click", async () => {
  if (continentForm) {
    const formData = new FormData(continentForm);
    selectedContinent = formData.get("continent") as string;
  }
  !!qrCode && !qrShown ? await showQrCode() : await startGame();
});

// Skip QR code
skipButton?.addEventListener("click", () => {
  clearInterval(pollingInterval);
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
  await pollForPoo(sessionPkh);
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
    await fetchNewGame(selectedContinent);

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
