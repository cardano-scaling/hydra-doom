let global: {
  txs: HTMLDataListElement | null;
  bytes: HTMLDataListElement | null;
  kills: HTMLDataListElement | null;
  items: HTMLDataListElement | null;
  secrets: HTMLDataListElement | null;
  playTime: HTMLDataListElement | null;
};
export let session: typeof global;
global = {
  txs: document.querySelector("#global-txs"),
  bytes: document.querySelector("#global-bytes"),
  kills: document.querySelector("#global-kills"),
  items: document.querySelector("#global-items"),
  secrets: document.querySelector("#global-secrets"),
  playTime: document.querySelector("#global-play-time"),
};
session = {
  txs: document.querySelector("#session-txs"),
  bytes: document.querySelector("#session-bytes"),
  kills: document.querySelector("#session-kills"),
  items: document.querySelector("#session-items"),
  secrets: document.querySelector("#session-secrets"),
  playTime: document.querySelector("#session-play-time"),
};
let gameServerUrl = process.env.SERVER_URL;
if (!gameServerUrl) {
  gameServerUrl = "http://localhost:8000";
  console.warn(
    `Defaulting SERVER_URL to ${gameServerUrl}, use .env to configure`,
  );
}

// Function to update UI with fetched data
export function updateUI(elements: typeof global, data: any) {
  if (elements.txs && data.transactions !== undefined) {
    elements.txs.innerText = new Intl.NumberFormat("en").format(
      data.transactions,
    );
  }
  if (elements.bytes && data.bytes !== undefined) {
    elements.bytes.innerText = new Intl.NumberFormat("en").format(data.bytes);
  }
  if (elements.kills && data.kills !== undefined) {
    elements.kills.innerText = new Intl.NumberFormat("en").format(data.kills);
  }
  if (elements.items && data.items !== undefined) {
    elements.items.innerText = new Intl.NumberFormat("en").format(data.items);
  }
  if (elements.secrets && data.secrets !== undefined) {
    elements.secrets.innerText = new Intl.NumberFormat("en").format(
      data.secrets,
    );
  }
  if (elements.playTime && data.play_time !== undefined) {
    elements.playTime.innerText = new Intl.NumberFormat("en").format(
      data.play_time,
    );
  }
}

// Function to fetch data from the API
async function fetchData() {
  try {
    const response = await fetch(`${gameServerUrl}/global`);
    if (!response.ok) {
      throw new Error("Network response was not ok " + response.statusText);
    }
    const data = await response.json();
    updateUI(global, data);
  } catch (error) {
    console.error("Fetch error: ", error);
  }
}

// Start querying the REST API at intervals
export function startQueryingAPI() {
  fetchData(); // Initial fetch
  setInterval(fetchData, 1000); // Fetch data every 5 seconds
}
