import { Lucid } from "lucid-cardano";
import { useCallback, useEffect, useState } from "react";
import useKeys from "./useKeys";

const useAddress = () => {
  const [address, setAddress] = useState<string>();
  const { sessionKey } = useKeys();

  const generateAddress = useCallback(async () => {
    if (sessionKey) {
      const lucid = await Lucid.new(undefined, "Preprod");
      const val = await lucid
        .selectWalletFromPrivateKey(sessionKey)
        .wallet.address();
      setAddress(val);
    }
  }, [sessionKey]);

  useEffect(() => {
    if (!address) {
      generateAddress();
    }
  }, [address, generateAddress]);

  return address;
};

export default useAddress;
