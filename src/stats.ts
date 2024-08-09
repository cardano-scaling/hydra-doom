let global: {
  games: HTMLDataListElement | null;
  gamesActive: HTMLDataListElement | null;
  txs: HTMLDataListElement | null;
  bytes: HTMLDataListElement | null;
  kills: HTMLDataListElement | null;
  items: HTMLDataListElement | null;
  secrets: HTMLDataListElement | null;
  playTime: HTMLDataListElement | null;
};
export let session: {
  txs: HTMLDataListElement | null;
  bytes: HTMLDataListElement | null;
  kills: HTMLDataListElement | null;
  items: HTMLDataListElement | null;
  secrets: HTMLDataListElement | null;
  playTime: HTMLDataListElement | null;
};
global = {
  games: document.querySelector("#global-games"),
  gamesActive: document.querySelector("#global-games-active"),
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
const txPreview: HTMLTableElement | null =
  document.querySelector("#tx-details");
let gameServerUrl = process.env.SERVER_URL;
if (!gameServerUrl) {
  gameServerUrl = "http://localhost:8000";
  console.warn(
    `Defaulting SERVER_URL to ${gameServerUrl}, use .env to configure`,
  );
}

// Function to update UI with fetched data
export function updateUI(elements: any, data: any) {
  if (elements.games && data.total_games !== undefined) {
    elements.games.innerText = new Intl.NumberFormat("en").format(
      data.total_games,
    );
  }
  if (elements.gamesActive && data.active_games !== undefined) {
    elements.gamesActive.innerText = new Intl.NumberFormat("en").format(
      data.active_games,
    );
  }
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

export function appendTx(cmd: any, player: any) {
  if (txPreview) {
    const html = `<tr><td>Tx • {forward: ${cmd.forwardMove} • side: ${cmd.sideMove} }</td><td>GameState • { kills: ${player.killCount} • pos_x: ${player.mapObject.position.momentumX}} </td></tr>`;
    var newRow = txPreview.insertRow(0);
    newRow.outerHTML = html;
    if (txPreview.rows.length > 10) {
      txPreview.deleteRow(txPreview.rows.length - 1);
    }
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
