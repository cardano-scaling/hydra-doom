import { NETWORK_ID, PRIVATE_KEY } from "../constants";

import { Core } from "@blaze-cardano/sdk";
import { useEffect, useState, useRef } from "react";
import * as ed25519 from "@noble/ed25519";
import { blake2b } from "@noble/hashes/blake2b";
import { Keys } from "../types";
import { toHex } from "../utils/helpers";

const useKeys = () => {
  const [keys, setKeys] = useState<Keys | null>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initKeys = async () => {
      const privateKeyBytes = PRIVATE_KEY;
      const publicKeyBytes = await ed25519.getPublicKeyAsync(privateKeyBytes);
      const publicKeyHashBytes = blake2b(publicKeyBytes, { dkLen: 224 / 8 });
      const publicKeyHashHex = toHex(publicKeyHashBytes);

      setKeys({
        privateKeyBytes,
        privateKeyHex: toHex(privateKeyBytes),
        publicKeyBytes,
        publicKeyHex: toHex(publicKeyBytes),
        publicKeyHashBytes,
        publicKeyHashHex,
        address: Core.addressFromCredential(
          NETWORK_ID === 1 ? Core.NetworkId.Mainnet : Core.NetworkId.Testnet,
          Core.Credential.fromCore({
            type: Core.CredentialType.KeyHash,
            hash: Core.Hash28ByteBase16(publicKeyHashHex),
          }),
        ).toBech32(),
      });
    };

    initKeys();
  }, []);

  return keys;
};

export default useKeys;
