const txPerSecond: HTMLDataListElement | null = document.querySelector("#txps");
const bytesPerSecond: HTMLDataListElement | null =
  document.querySelector("#bps");
console.log({ txPerSecond, bytesPerSecond });

// Function to update UI with fetched data
function updateUI(data: any) {
  if (txPerSecond && data.transactions !== undefined) {
    txPerSecond.innerText = new Intl.NumberFormat("en").format(
      data.transactions,
    );
  }
  if (bytesPerSecond && data.bytes !== undefined) {
    bytesPerSecond.innerText = new Intl.NumberFormat("en").format(data.bytes);
  }
}

// Function to fetch data from the API
async function fetchData() {
  try {
    // FIXME: should use SERVER_URL (see hydra.ts)
    const response = await fetch("http://3.15.33.186:8000/global");
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
