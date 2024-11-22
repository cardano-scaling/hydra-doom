import { useLocalStorage } from "usehooks-ts";
import { HYDRA_DOOM_SESSION_KEY, NETWORK_ID } from "../constants";
import { useEffect, useState, useCallback } from "react";
import { Lucid, toHex } from "lucid-cardano";
import * as bech32 from "bech32-buffer";
import * as ed25519 from "@noble/ed25519";
import { blake2b } from "@noble/hashes/blake2b";
import { Keys } from "../types";

const useKeys = () => {
  const [keys, setKeys] = useState<Keys | null>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initKeys = async () => {
      const lucid = await Lucid.new(
        undefined,
        NETWORK_ID === 1 ? "Mainnet" : "Preprod",
      );

      const key = lucid.utils.generatePrivateKey();
      const privateKeyBytes = bech32.decode(key).data;
      const publicKeyBytes = await ed25519.getPublicKeyAsync(privateKeyBytes);
      const publicKeyHashBytes = blake2b(publicKeyBytes, { dkLen: 224 / 8 });
      const publicKeyHashHex = toHex(publicKeyHashBytes);

      setKeys({
        sessionKeyBech32: key,
        privateKeyBytes,
        privateKeyHex: toHex(privateKeyBytes),
        publicKeyBytes,
        publicKeyHex: toHex(publicKeyBytes),
        publicKeyHashBytes,
        publicKeyHashHex,
        address: lucid.utils.credentialToAddress({
          type: "Key",
          hash: publicKeyHashHex,
        }),
      });
    };

    initKeys();
  }, []);

  return keys;
};

export default useKeys;
