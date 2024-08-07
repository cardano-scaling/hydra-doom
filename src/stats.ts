const txPerSecond: HTMLDataListElement | null = document.querySelector("#txps");
const bytesPerSecond: HTMLDataListElement | null =
  document.querySelector("#bps");
const kills: HTMLDataListElement | null = document.querySelector("#kills");
const items: HTMLDataListElement | null = document.querySelector("#items");
const secrets: HTMLDataListElement | null = document.querySelector("#secrets");
const playTime: HTMLDataListElement | null =
  document.querySelector("#playTime");
let gameServerUrl = process.env.SERVER_URL;
if (!gameServerUrl) {
  gameServerUrl = "http://localhost:8000";
  console.warn(
    `Defaulting SERVER_URL to ${gameServerUrl}, use .env to configure`,
  );
}

// Function to update UI with fetched data
function updateUI(data: any) {
  if (txPerSecond && data.transactions !== undefined) {
    txPerSecond.innerText = new Intl.NumberFormat("en").format(
      data.transactions
    );
  }
  if (bytesPerSecond && data.bytes !== undefined) {
    bytesPerSecond.innerText = new Intl.NumberFormat("en").format(data.bytes);
  }
  if (kills && data.kills !== undefined) {
    kills.innerText = new Intl.NumberFormat("en").format(data.kills);
  }
  if (items && data.items !== undefined) {
    items.innerText = new Intl.NumberFormat("en").format(data.items);
  }
  if (secrets && data.secrets !== undefined) {
    secrets.innerText = new Intl.NumberFormat("en").format(data.secrets);
  }
  if (playTime && data.play_time !== undefined) {
    playTime.innerText = new Intl.NumberFormat("en").format(data.play_time);
  }
}

// Function to fetch data from the API
async function fetchData() {
  try {
    // FIXME: should use SERVER_URL (see hydra.ts)
    const response = await fetch(
      `${gameServerUrl}/global`,
    );
    if (!response.ok) {
      throw new Error("Network response was not ok " + response.statusText);
    }
    const data = await response.json();
    updateUI(data);
  } catch (error) {
    console.error("Fetch error: ", error);
  }
}

// Start querying the REST API at intervals
export function startQueryingAPI() {
  fetchData(); // Initial fetch
  setInterval(fetchData, 1000); // Fetch data every 5 seconds
}
