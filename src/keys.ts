import * as ed25519 from "@noble/ed25519";
import * as bech32 from "bech32-buffer";
import { encode } from "cbor-x";
import { Lucid } from "lucid-cardano";
import { sha512 } from "@noble/hashes/sha512";

ed25519.etc.sha512Async = (...m) =>
  Promise.resolve(sha512(ed25519.etc.concatBytes(...m)));

import QRCodeStyling, {
  CornerDotType,
  CornerSquareType,
  DotType,
  DrawType,
  ErrorCorrectionLevel,
  Mode,
  TypeNumber,
} from "styled-qr-code";

const cabinetKey = process.env.CABINET_KEY;
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

const qr_code_options = {
  width: 512,
  height: 512,
  type: "png" as DrawType,
  image: "assets/images/hydra_outline_small.png",
  margin: 0,
  qrOptions: {
    typeNumber: 0 as TypeNumber,
    mode: "Byte" as Mode,
    errorCorrectionLevel: "Q" as ErrorCorrectionLevel,
  },
  imageOptions: {
    hideBackgroundDots: false,
    imageSize: 1,
    margin: 0,
    crossOrigin: "anonymous",
  },
  dotsOptions: {
    type: "square" as DotType,
    color: "#000000",
  },
  backgroundOptions: {
    color: "#ffffff",
  },
  cornersSquareOptions: {
    type: "extra-rounded" as CornerSquareType,
    color: "#000000",
  },
  cornersDotOptions: {
    type: "dot" as CornerDotType,
    color: "#000000",
  },
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

  const qr_code_url = `web+cardano://claim/v1?faucet_url=https%3A%2F%2Fauth.hydradoom.fun/v1&code=${code}`;
  const qrcode = new QRCodeStyling({ ...qr_code_options, data: qr_code_url });
  return qrcode.toDataUrl("png");
}
