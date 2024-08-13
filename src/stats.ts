import { keys } from "./keys";
import { setGlobalSpeedometerValue } from "./speedometer";
import { GameStatistics, LeaderboardEntry, PlayerStats } from "./types";
let global: {
  games: NodeListOf<HTMLDataListElement>;
  gamesActive: NodeListOf<HTMLDataListElement>;
  txs: NodeListOf<HTMLDataListElement>;
  bytes: NodeListOf<HTMLDataListElement>;
  kills: NodeListOf<HTMLDataListElement>;
  items: NodeListOf<HTMLDataListElement>;
  secrets: NodeListOf<HTMLDataListElement>;
  playTime: NodeListOf<HTMLDataListElement>;
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
  games: document.querySelectorAll(".global-games"),
  gamesActive: document.querySelectorAll(".global-games-active"),
  txs: document.querySelectorAll(".global-txs"),
  bytes: document.querySelectorAll(".global-bytes"),
  kills: document.querySelectorAll(".global-kills"),
  items: document.querySelectorAll(".global-items"),
  secrets: document.querySelectorAll(".global-secrets"),
  playTime: document.querySelectorAll(".global-play-time"),
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
    `Defaulting SERVER_URL to ${gameServerUrl}, use .env to configure`
  );
}

const { sessionPkh } = keys;
const TIC_RATE_MAGIC = 35; // 35 is the ticrate in DOOM WASM they use to calculate time.

// Function to update UI with fetched data
let recent_queries: any[] = [];
export function updateUI(elements: any, data: any) {
  if (elements.games && data.total_games !== undefined) {
    elements.games.innerText = new Intl.NumberFormat("en").format(
      data.total_games
    );
  }
  if (elements.gamesActive && data.active_games !== undefined) {
    elements.gamesActive.innerText = new Intl.NumberFormat("en").format(
      data.active_games
    );
  }

  if (elements.txs && data.transactions !== undefined) {
    elements.txs.innerText = new Intl.NumberFormat("en").format(
      data.transactions
    );
  }
  if (elements.bytes && data.bytes !== undefined) {
    elements.bytes.innerText = new Intl.NumberFormat("en").format(data.bytes);
  }
  if (elements.kills && data.total_kills !== undefined) {
    let kills = data.total_kills;
    for (const player in data.kills ?? []) {
      kills += data.kills[player];
    }
    elements.kills.innerText = new Intl.NumberFormat("en").format(kills);
  }
  if (elements.items && data.total_items !== undefined) {
    let items = data.total_items;
    for (const player in data.items ?? []) {
      items += data.items[player];
    }
    elements.items.innerText = new Intl.NumberFormat("en").format(items);
  }
  if (elements.secrets && data.total_secrets !== undefined) {
    let secrets = data.total_secrets;
    for (const player in data.secrets ?? []) {
      secrets += data.secrets[player];
    }
    elements.secrets.innerText = new Intl.NumberFormat("en").format(secrets);
  }
  if (elements.playTime && data.total_play_time !== undefined) {
    let total_play_time = data.total_play_time;
    for (const player in data.player_play_time ?? []) {
      for (const time of data.player_play_time[player] ?? []) {
        total_play_time += time;
      }
    }
    elements.playTime.innerText = formatPlayTime(
      total_play_time / TIC_RATE_MAGIC
    );
  }
}

export function updateGlobalsUI(data: GameStatistics) {
  if (data.total_games !== undefined) {
    global.games.forEach((element) => {
      element.innerText = new Intl.NumberFormat("en").format(data.total_games);
    });
  }
  if (data.active_games !== undefined) {
    global.gamesActive.forEach((element) => {
      element.innerText = new Intl.NumberFormat("en").format(data.active_games);
    });
  }

  if (data.transactions !== undefined) {
    recent_queries.push({
      timestamp: performance.now(),
      transactions: data.transactions,
    });
    if (recent_queries.length > 5) {
      let last = recent_queries.shift();
      let difference = data.transactions - last.transactions;
      let time_diff = (performance.now() - last.timestamp) / 1000;
      setGlobalSpeedometerValue(Math.round(difference / time_diff));
    }
    global.txs.forEach((element) => {
      element.innerText = new Intl.NumberFormat("en").format(data.transactions);
    });
  }
  if (data.bytes !== undefined) {
    global.bytes.forEach((element) => {
      element.innerText = new Intl.NumberFormat("en").format(data.bytes);
    });
  }
  if (data.total_kills !== undefined) {
    let kills = data.total_kills;
    for (const player in data.kills ?? []) {
      kills += data.kills[player];
    }
    global.kills.forEach((element) => {
      element.innerText = new Intl.NumberFormat("en").format(kills);
    });
  }
  if (data.total_items !== undefined) {
    let items = data.total_items;
    for (const player in data.items ?? []) {
      items += data.items[player];
    }
    global.items.forEach((element) => {
      element.innerText = new Intl.NumberFormat("en").format(items);
    });
  }
  if (data.total_secrets !== undefined) {
    let secrets = data.total_secrets;
    for (const player in data.secrets ?? []) {
      secrets += data.secrets[player];
    }
    global.secrets.forEach((element) => {
      element.innerText = new Intl.NumberFormat("en").format(secrets);
    });
  }
  if (data.total_play_time !== undefined) {
    let total_play_time = data.total_play_time;
    for (const player in data.player_play_time ?? []) {
      for (const time of data.player_play_time[player] ?? []) {
        total_play_time += time;
      }
    }
    global.playTime.forEach((element) => {
      element.innerText = formatPlayTime(total_play_time / TIC_RATE_MAGIC);
    });
  }
}

function formatPlayTime(playTimeSeconds: number): string {
  const days = Math.floor(playTimeSeconds / (24 * 3600));
  playTimeSeconds %= 24 * 3600;
  const hours = Math.floor(playTimeSeconds / 3600);
  playTimeSeconds %= 3600;
  const minutes = Math.floor(playTimeSeconds / 60);
  playTimeSeconds %= 60;

  return `${String(days).padStart(2, "0")}:${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(Math.trunc(playTimeSeconds)).padStart(2, "0")}`;
}

export function appendTx(cmd: any) {
  if (txPreview) {
    const html = `<tr><td>Tx • {forward: ${cmd.forwardMove} • side: ${cmd.sideMove} }</td></tr>`;
    var newRow = txPreview.insertRow(0);
    newRow.outerHTML = html;
    if (txPreview.rows.length > 10) {
      txPreview.deleteRow(txPreview.rows.length - 1);
    }
  }
}

const CACHE_KEY = "playerHandleCache";
const cache: { [key: string]: string } = JSON.parse(
  localStorage.getItem(CACHE_KEY) || "{}"
);

async function fetchPlayerHandle(player: string): Promise<string> {
  if (cache[player]) {
    return cache[player];
  }

  try {
    const response = await fetch(
      `https://auth.hydradoom.fun/v1/session/${player}`
    );
    const data = await response.json();

    if (data.handle) {
      cache[player] = `\$${data.handle}`;
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      return data.handle;
    } else {
      const truncatedPlayer = truncateString(player, 7, 7);
      cache[player] = truncatedPlayer;
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      return truncatedPlayer;
    }
  } catch (error) {
    console.error("Error fetching player handle:", player, error);
    const truncatedPlayer = truncateString(player, 7, 7);
    cache[player] = truncatedPlayer;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    return truncatedPlayer;
  }
}

export function truncateString(
  str: string,
  frontLen: number,
  backLen: number
): string {
  if (str.length <= frontLen + backLen) {
    return str;
  }
  return `${str.substring(0, frontLen)}...${str.substring(str.length - backLen)}`;
}

async function populateAllTimeTable(
  table: HTMLTableElement,
  leaderboard: LeaderboardEntry[]
) {
  // Clear existing rows
  while (table.rows.length > 1) {
    table.deleteRow(1);
  }

  // Filter out entries with a score of 0
  const filteredLeaderboard = leaderboard.filter(([, score]) => score > 0);

  for (const [player, score] of filteredLeaderboard) {
    const row = table.insertRow();
    const playerCell = row.insertCell(0);
    const scoreCell = row.insertCell(1);

    const handle = await fetchPlayerHandle(player);
    playerCell.innerText = handle;
    scoreCell.innerText = new Intl.NumberFormat("en-US", {
      notation: "compact",
    })
      .format(score)
      .toString();

    // Highlight the row if the player matches sessionPkh
    if (player === sessionPkh) {
      row.classList.add("highlight");
    }
  }
}

async function populateCurrentTable(
  table: HTMLTableElement,
  current: PlayerStats
) {
  // Clear existing rows
  while (table.rows.length > 1) {
    table.deleteRow(1);
  }

  const sortedEntries = Object.entries(current)
    .filter(([, score]) => score > 0)
    .sort(([playerA, scoreA], [playerB, scoreB]) => {
      if (scoreB !== scoreA) return scoreB - scoreA;
      return playerA.localeCompare(playerB);
    })
    .slice(0, 10);

  for (const [player, score] of sortedEntries) {
    const row = table.insertRow();
    const playerCell = row.insertCell(0);
    const scoreCell = row.insertCell(1);

    const handle = await fetchPlayerHandle(player);
    playerCell.innerText = handle;
    scoreCell.innerText = new Intl.NumberFormat("en-US", {
      notation: "compact",
    })
      .format(score)
      .toString();

    // Highlight the row if the player matches sessionPkh
    if (player === sessionPkh) {
      row.classList.add("highlight");
    }
  }
}

function updateLeaderboard(data: GameStatistics) {
  const currentKillsTable = document.getElementById(
    "current-kills-leaderboard"
  ) as HTMLTableElement;
  const currentItemsTable = document.getElementById(
    "current-items-leaderboard"
  ) as HTMLTableElement;
  const currentSecretsTable = document.getElementById(
    "current-secrets-leaderboard"
  ) as HTMLTableElement;
  const allKillsTable = document.querySelectorAll(
    ".js-all-time-kills-leaderboard"
  );
  const allTimeItemsTable = document.querySelectorAll(
    ".js-all-time-items-leaderboard"
  );
  const allTimeSecretsTable = document.querySelectorAll(
    ".js-all-time-secrets-leaderboard"
  );

  // Populate current tables with kills, items, and secrets
  populateCurrentTable(currentKillsTable, data.kills);
  populateCurrentTable(currentItemsTable, data.items);
  populateCurrentTable(currentSecretsTable, data.secrets);

  // Populate all-time tables with kills_leaderboard, items_leaderboard, and secrets_leaderboard
  allKillsTable.forEach((table) => {
    populateAllTimeTable(table as HTMLTableElement, data.kills_leaderboard);
  });

  allTimeItemsTable.forEach((table) => {
    populateAllTimeTable(table as HTMLTableElement, data.items_leaderboard);
  });

  allTimeSecretsTable.forEach((table) => {
    populateAllTimeTable(table as HTMLTableElement, data.secrets_leaderboard);
  });
}

// Function to fetch data from the API
async function fetchData() {
  try {
    const response = await fetch(`${gameServerUrl}/global`);
    if (!response.ok) {
      throw new Error("Network response was not ok " + response.statusText);
    }
    const data: GameStatistics = await response.json();
    updateGlobalsUI(data);
    updateLeaderboard(data);
  } catch (error) {
    console.error("Fetch error: ", error);
  }
}

// Start querying the REST API at intervals
export function startQueryingAPI() {
  fetchData(); // Initial fetch
  setInterval(fetchData, 1000); // Fetch data every 5 seconds
}
