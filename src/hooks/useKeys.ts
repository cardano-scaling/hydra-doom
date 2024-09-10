import { useLocalStorage } from "usehooks-ts";
import { HYDRA_DOOM_SESSION_KEY } from "../constants";
import { useCallback, useEffect, useState } from "react";
import { Lucid } from "lucid-cardano";
import * as bech32 from "bech32-buffer";
import * as ed25519 from "@noble/ed25519";
import { blake2b } from "@noble/hashes/blake2b";
import { toHex } from "../utils/numbers";

interface Keys {
  privateKey?: string;
  sessionKey?: string;
  sessionPk?: string;
  sessionPkh?: string;
}

const useKeys = () => {
  const [sessionKey, setSessionKey] = useLocalStorage<string>(
    HYDRA_DOOM_SESSION_KEY,
    "",
  );
  const [keys, setKeys] = useState<Keys>({
    privateKey: undefined,
    sessionKey: undefined,
    sessionPk: undefined,
    sessionPkh: undefined,
  });

  const generateKeys = useCallback(async () => {
    let key = sessionKey;
    if (!sessionKey) {
      console.log("Generating new session key");
      const lucid = await Lucid.new(undefined, "Preprod");
      key = lucid.utils.generatePrivateKey();
      setSessionKey(key);
    }

    const decodedSessionKey = Array.from(bech32.decode(key).data)
      .map(toHex)
      .join("");
    const sessionPk = await ed25519.getPublicKeyAsync(decodedSessionKey);
    const sessionPkh = blake2b(sessionPk, { dkLen: 224 / 8 });
    setKeys({
      privateKey: decodedSessionKey,
      sessionKey,
      sessionPk: ed25519.etc.bytesToHex(sessionPk),
      sessionPkh: ed25519.etc.bytesToHex(sessionPkh),
    });
  }, [sessionKey, setSessionKey]);

  useEffect(() => {
    generateKeys();
  }, [generateKeys, sessionKey]);

  return keys;
};

export default useKeys;
