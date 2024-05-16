import { Data, Lucid, UTxO } from "lucid-cardano";

import { HydraProvider } from "./lucid-provider-hydra";

// Setup a lucid instance running against hydra

console.log("Setting up a lucid instance against hydra");
const lucid = await Lucid.new(
  new HydraProvider("http://localhost:4001"),
  "Preprod",
);
console.log(lucid);

// Private key of the wallet used in hydra devnet:
//
// Using a carddano-cli envelope file with a PaymentSigningKeyShelley_ed25519 type:
// cat /tmp/hydra-cluster-Nothing-2bf845ef1b4b44aa/wallet.sk | jq -r .cborHex | cut -c 5- | bech32 ed25519_sk
const privateKey =
  "ed25519_sk1l3r62rzyrk7le5pyplyysthagqkm4wgwks86rfvzwl67vg0ectuqqvv9kw";
lucid.selectWalletFromPrivateKey(privateKey);
console.error(
  "Using ad-hoc wallet",
  privateKey,
  "with address: ",
  await lucid.wallet.address(),
);

// Makeshift hydra client

console.log("connecting to hydra head at ws://127.0.0.1:4001");

const protocol = window.location.protocol == "https:" ? "wss:" : "ws:";
const conn = new WebSocket(protocol + "//127.0.0.1:4001?history=no");

conn.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  switch (msg.tag) {
    default:
      console.log("Hydra websocket", "Received", msg);
  }
});

async function getUTxO() {
  const res = await fetch("http://127.0.0.1:4001/snapshot/utxo");
  return res.json();
}

// Callbacks from forked doom-wasm

let latestCmd = { forwardMove: 0 };

let latestUTxO: UTxO | null = null;

export async function hydraSend(cmd: { forwardMove: number }) {
  console.log("hydraSend", cmd);

  if (latestUTxO == null) {
    const utxo = await getUTxO();
    console.log("query spendable utxo", utxo);
    const txIn = Object.keys(utxo)[0];
    const [txHash, ixStr] = txIn.split("#");
    const txOut = utxo[txIn];
    console.log("selected txOut", txOut);
    latestUTxO = {
      txHash,
      outputIndex: Number.parseInt(ixStr),
      address: txOut.address,
      assets: txOut.value,
    };
  }
  console.log("spending from", latestUTxO);
  const tx = await lucid
    .newTx()
    .collectFrom([latestUTxO])
    .payToAddressWithData(
      latestUTxO.address,
      { inline: Data.to(BigInt(cmd.forwardMove)) },
      latestUTxO.assets,
    )
    .complete();
  console.log("tx", tx);
  const signedTx = await tx.sign().complete();
  console.log("signed", tx);
  const txid = await signedTx.submit();
  console.log("submitted", txid);
  latestUTxO.txHash = txid;
}

export function hydraRecv() {
  const cmd = latestCmd;
  console.log("receive next decoded command from head", cmd);
  return cmd;
}
