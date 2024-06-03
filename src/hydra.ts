import { Data, Lucid, UTxO } from "lucid-cardano";

import { HydraProvider } from "./lucid-provider-hydra";
import { GameData, PlayerState, buildDatum, initialGameData } from "./datum";

// Setup a lucid instance running against hydra

console.log("Setting up a lucid instance against hydra");
const lucid = await Lucid.new(
  new HydraProvider("http://3.15.33.186:4001"),
  "Preprod",
);
console.log(lucid);

// Private key of the wallet used in hydra devnet:
//
// Using a cardano-cli envelope file with a PaymentSigningKeyShelley_ed25519 type:
// cat /tmp/hydra-cluster-Nothing-2bf845ef1b4b44aa/wallet.sk | jq -r .cborHex | cut -c 5- | bech32 ed25519_sk
const privateKey =
  process.env.SIGNING_KEY ||
  "ed25519_sk1l3r62rzyrk7le5pyplyysthagqkm4wgwks86rfvzwl67vg0ectuqqvv9kw";
lucid.selectWalletFromPrivateKey(privateKey);

console.info(
  "Using ad-hoc wallet",
  privateKey,
  "with address: ",
  await lucid.wallet.address(),
);

const pkh = lucid.utils.getAddressDetails(await lucid.wallet.address())
  .paymentCredential?.hash;

// Makeshift hydra client

console.log("connecting to hydra head at ws://3.15.33.186:4001");

const protocol = window.location.protocol == "https:" ? "wss:" : "ws:";
const conn = new WebSocket(protocol + "//3.15.33.186:4001?history=no");

async function getUTxO() {
  const res = await fetch("http://3.15.33.186:4001/snapshot/utxo");
  return res.json();
}

// Callbacks from forked doom-wasm

type Cmd = { forwardMove: number };

let latestUTxO: UTxO | null = null;
let lastTime: number = 0;
let frameNumber = 0;

let gameData: GameData = initialGameData(pkh ?? "");
export async function hydraSend(cmd: Cmd) {
  console.log("hydraSend", cmd);

  if (latestUTxO == null) {
    const utxo = await getUTxO();
    console.log("query spendable utxo", utxo);
    const txIn = Object.keys(utxo)[0];
    const [txHash, ixStr] = txIn.split("#");
    const txOut = utxo[txIn];
    const datum = txOut.inlineDatum;
    console.log("selected txOut", txOut);
    console.log("Datum", JSON.stringify(datum));

    latestUTxO = {
      txHash,
      outputIndex: Number.parseInt(ixStr),
      address: txOut.address,
      assets: txOut.value,
    };
  }

  const inline = buildDatum(gameData);
  console.log("Inline Datum", inline);
  // console.log("spending from", latestUTxO);
  const tx = await lucid
    .newTx()
    .collectFrom([latestUTxO])
    .payToAddressWithData(latestUTxO.address, { inline }, latestUTxO.assets)
    .complete();
  // console.log("tx", tx);
  const signedTx = await tx.sign().complete();
  lastTime = performance.now();
  if (frameNumber % 1 == 0) {
    // console.log("signed", tx);
    const txid = await signedTx.submit();
    // console.log("submitted", txid);
    latestUTxO.txHash = txid;
  }
  frameNumber++;
}

export async function hydraRecv(): Promise<Cmd> {
  console.log("hydraRecv");
  return new Promise((res, rej) => {
    // TODO: re-use event listeners?
    const onMessage = (e: MessageEvent) => {
      const msg = JSON.parse(e.data);
      switch (msg.tag) {
        case "TxValid":
          let elapsed = performance.now() - lastTime;
          console.log("round trip: ", elapsed, "ms");
          const tx = lucid.fromTx(msg.transaction.cborHex);
          const datum = tx.txComplete
            .body()
            .outputs()
            .get(0)
            .datum()
            ?.as_data()
            ?.to_js_value().datum;
          const cmd = { forwardMove: datum.Integer };
          console.log("received", cmd);
          conn.removeEventListener("message", onMessage);
          res(cmd);
          break;
        // XXX: Learning: ideally we should be only acting on snapshot confirmed, but I was
        // inclined to use TxValid instead because it requires less book-keeping.
        case "SnapshotConfirmed":
          break;
        default:
          conn.removeEventListener("message", onMessage);
          rej("Unexpected message: " + e.data);
      }
    };
    conn.addEventListener("message", onMessage);
  });
}
