import React, { useEffect, useState } from "react";
import Modal from "../Modal";
import { API_BASE_URL, API_KEY } from "../../constants";
import { useQuery } from "@tanstack/react-query";
import Button from "../Button";
import {
  FaWallet,
  FaDiscord,
  FaGithub,
  FaGoogle,
  FaTwitter,
} from "react-icons/fa6";
import { useAppContext } from "../../context/useAppContext";
import { AuthResponse } from "../../types";
import { useSessionReferenceKeyCache } from "../../utils/localStorage";
import { checkSignin, fetchAuthProviders } from "../../utils/requests";

interface LoginModalProps {
  close: () => void;
  isOpen: boolean;
  showActionButtons: () => void;
}

const providerIcons: { [key: string]: JSX.Element } = {
  wallet: <FaWallet />,
  google: <FaGoogle />,
  twitter: <FaTwitter />,
  discord: <FaDiscord />,
  github: <FaGithub />,
};

const LoginModal: React.FC<LoginModalProps> = ({
  close,
  isOpen,
  showActionButtons,
}) => {
  const [, setSessionReference] = useSessionReferenceKeyCache();
  const { keys, setAccountData } = useAppContext();
  const { publicKeyHashHex } = keys || {};
  const [isWaitingSigning, setIsWaitingSigning] = useState(false);

  const { data: providers, isLoading: isLoadingProviders } = useQuery<string[]>(
    {
      queryKey: ["authProviders"],
      queryFn: fetchAuthProviders,
    },
  );

  const { data: userData } = useQuery<AuthResponse>({
    queryKey: ["signinCheck", publicKeyHashHex],
    queryFn: () => checkSignin(publicKeyHashHex ?? ""),
    enabled: !!publicKeyHashHex && isWaitingSigning,
    refetchInterval: 1000,
  });

  useEffect(() => {
    if (userData?.authenticated) {
      setIsWaitingSigning(false);
      close();
      showActionButtons();
      setAccountData(userData.account);
      if (publicKeyHashHex) setSessionReference(publicKeyHashHex);
    }
  }, [
    close,
    publicKeyHashHex,
    setAccountData,
    setSessionReference,
    showActionButtons,
    userData?.account,
    userData?.authenticated,
  ]);

  const handleLogin = (provider: string) => {
    if (!publicKeyHashHex) return;
    const redirectUrl = `${API_BASE_URL}/auth/init/${API_KEY}/${provider}/?reference=${publicKeyHashHex}`;
    window.open(redirectUrl, "_blank")?.focus();
    setIsWaitingSigning(true);
  };

  const renderContent = () => {
    if (isWaitingSigning) return <p>Waiting for you to sign-in...</p>;
    if (isLoadingProviders || !publicKeyHashHex) return <p>Loading...</p>;
    if (!providers?.length) return <p>No providers available.</p>;

    return (
      <div className="flex flex-col gap-6 items-center">
        {providers.map((provider) => (
          <Button
            className="w-96 h-16 flex items-center gap-4 capitalize"
            key={provider}
            onClick={() => handleLogin(provider)}
          >
            {providerIcons[provider]} {provider}
          </Button>
        ))}
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} close={close}>
      <div className="text-center text-4xl flex flex-col gap-8">
        <h1 className="text-5xl uppercase">Tournament Login</h1>
        <p className="mb-4">
          Please select a provider to login with. If you don't have an account
          you can create one with the provider of your choice.
        </p>
        {renderContent()}
      </div>
    </Modal>
  );
};

export default LoginModal;
