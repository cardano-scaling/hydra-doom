import { Lucid } from "lucid-cardano";

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
// cat /tmp/hydra-cluster-Nothing-2bf845ef1b4b44aa/wallet.sk
//  {
//      "type": "PaymentSigningKeyShelley_ed25519",
//      "description": "",
//      "cborHex": "5820<bytes>"
//  }
//
// bech32 ed25519_sk <<< <bytes>
const privateKey =
  "ed25519_sk1jj5y0j002ygeyhpj6v6ss8784thq7lkj4t2spzxlkvlf4qvyrvuqjqux8g";
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

export async function hydraSend(cmd: any) {
  console.log("encode and submit transaction for", cmd);

  // TODO: should not need to do this, but keep track in the client
  const utxo = await getUTxO();
  console.log("spendable utxo", utxo);

  const txIn = Object.keys(utxo)[0];
  const [txHash, ixStr] = txIn.split("#");
  const txOut = utxo[txIn];
  console.log("selected txOut", txOut);
  const input = {
    txHash,
    outputIndex: Number.parseInt(ixStr),
    address: txOut.address,
    assets: txOut.value,
  };
  console.log("spending from", input);
  const tx = await lucid
    .newTx()
    .collectFrom([input])
    .payToAddress(txOut.address, txOut.value)
    .complete();
  console.log("tx", tx);
  const signedTx = await tx.sign().complete();
  console.log("signed", tx);
  const txid = await signedTx.submit();
  console.log("submitted", txid);
}

export function hydraRecv() {
  const cmd = latestCmd;
  console.log("receive next decoded command from head", cmd);
  return cmd;
}
