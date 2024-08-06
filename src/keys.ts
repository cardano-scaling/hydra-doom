import * as ed25519 from "@noble/ed25519";
import * as bech32 from "bech32-buffer";
import { encode } from "cbor-x";
import { Lucid } from "lucid-cardano";
import * as QRCode from "qrcode";

const cabinetKey =
  window.localStorage.getItem("cabinet-key") ??
  (() => {
    const key = process.env.CABINET_KEY;
    if (key) {
      window.localStorage.setItem("cabinet-key", key);
      return key;
    }
  })();

let lucid = await Lucid.new(undefined, "Preprod");

// Load or generate a session key

let sessionKey = window.localStorage.getItem("hydra-doom-session-key");
if (!process.env.PERSISTENT_SESSION || sessionKey == null) {
  console.warn("Generating new session key");
  sessionKey = lucid.utils.generatePrivateKey();
  window.localStorage.setItem("hydra-doom-session-key", sessionKey);
}

const decodedSessionKey = Array.from(bech32.decode(sessionKey).data)
  .map(toHex)
  .join("");
const sessionPk = await ed25519.getPublicKeyAsync(decodedSessionKey);

function toHex(i: number) {
  return ("0" + i.toString(16)).slice(-2);
}

export const keys = {
  sessionKey,
  sessionPk: ed25519.etc.bytesToHex(sessionPk),
  cabinetKey,
};

export async function generatePooQrUri() {
  if (!sessionKey || !cabinetKey) {
    return undefined;
  }

  const cabinetPk = await ed25519.getPublicKeyAsync(cabinetKey);
  const signature = await ed25519.signAsync(sessionPk, cabinetKey);
  const code = ed25519.etc.bytesToHex(
    encode([sessionPk, [cabinetPk, signature]]),
  );

  return await QRCode.toDataURL(
    `web+cardano://claim/v1?faucet_url=https%3A%2F%2Fauth.hydradoom.fun/v1&code=${code}`,
  );
}
