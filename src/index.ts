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
  // Start querying the REST API at intervals
  startQueryingAPI();
});

// Function to fetch data from the API
async function fetchData() {
  try {
    const response = await fetch("http://3.15.33.186:8000/global");
    if (!response.ok) {
      throw new Error("Network response was not ok " + response.statusText);
    }
    const data = await response.json();
    console.log(data);
    updateUI(data);
  } catch (error) {
    console.error("Fetch error: ", error);
  }
}

// Function to update UI with fetched data
function updateUI(data: any) {
  if (txPerSecond && data.txPerSecond !== undefined) {
    txPerSecond.innerText = data.txPerSecond;
  }
  if (bytesPerSecond && data.bytesPerSecond !== undefined) {
    bytesPerSecond.innerText = data.bytesPerSecond;
  }
}

// Function to start querying the API at intervals
function startQueryingAPI() {
  fetchData(); // Initial fetch
  setInterval(fetchData, 5000); // Fetch data every 5 seconds
}
