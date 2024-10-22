import { useLocalStorage } from "usehooks-ts";
import { HYDRA_DOOM_SESSION_KEY } from "../constants";
import { useCallback, useEffect, useState } from "react";
import { Lucid, toHex } from "lucid-cardano";
import * as bech32 from "bech32-buffer";
import * as ed25519 from "@noble/ed25519";
import { blake2b } from "@noble/hashes/blake2b";

export interface Keys {
  sessionKeyBech32?: string;
  privateKeyBytes?: Uint8Array;
  privateKeyHex?: string;
  publicKeyBytes?: Uint8Array;
  publicKeyHex?: string;
  publicKeyHashBytes?: Uint8Array;
  publicKeyHashHex?: string;
  address?: string;
}

const useKeys = () => {
  const [sessionKeyBech32, setSessionKey] = useLocalStorage<string>(
    HYDRA_DOOM_SESSION_KEY,
    "",
  );
  const [keys, setKeys] = useState<Keys>({});

  const generateKeys = useCallback(async () => {
    const lucid = await Lucid.new(undefined, "Preprod");

    let key = sessionKeyBech32;
    if (!import.meta.env.PERSISTENT_SESSION || !sessionKeyBech32) {
      console.log("Generating new session key");
      key = lucid.utils.generatePrivateKey();
      setSessionKey(key);
    }

    const privateKeyBytes = bech32.decode(key).data;
    const publicKeyBytes = await ed25519.getPublicKeyAsync(privateKeyBytes);
    const publicKeyHashBytes = blake2b(publicKeyBytes, { dkLen: 224 / 8 });
    const publicKeyHashHex = toHex(publicKeyHashBytes);
    setKeys({
      sessionKeyBech32,
      privateKeyBytes,
      privateKeyHex: toHex(privateKeyBytes),
      publicKeyBytes,
      publicKeyHex: toHex(publicKeyBytes),
      publicKeyHashBytes,
      publicKeyHashHex,
      address: lucid.utils.credentialToAddress({ type: "Key", hash: publicKeyHashHex })
    });
  }, [sessionKeyBech32, setSessionKey]);

  useEffect(() => {
    generateKeys();
  }, [generateKeys, sessionKeyBech32]);

  return keys;
};

export default useKeys;
