import { toHex } from "./src/utils/helpers";

import * as ed25519 from "@noble/ed25519";
const privateKeyBytes = ed25519.utils.randomPrivateKey();
console.log(toHex(privateKeyBytes));
