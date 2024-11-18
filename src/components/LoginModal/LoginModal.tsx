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
import useKeys from "../../hooks/useKeys";
import { useAppContext } from "../../context/useAppContext";

interface LoginModalProps {
  isOpen: boolean;
  close: () => void;
}

const providerIcons: { [key: string]: JSX.Element } = {
  wallet: <FaWallet />,
  google: <FaGoogle />,
  twitter: <FaTwitter />,
  discord: <FaDiscord />,
  github: <FaGithub />,
};

const fetchAuthProviders = async (): Promise<string[]> => {
  const response = await fetch(`${API_BASE_URL}/auth/providers`);
  if (!response.ok) {
    throw new Error("Failed to fetch auth providers");
  }
  return response.json();
};

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, close }) => {
  const { accountData } = useAppContext();
  const { sessionKeyBech32 } = useKeys();
  const [isWaitingSigning, setIsWaitingSigning] = useState(false);

  const { data: providers, isLoading: isLoadingProviders } = useQuery<string[]>(
    {
      queryKey: ["authProviders"],
      queryFn: fetchAuthProviders,
    },
  );

  useEffect(() => {
    if (accountData) {
      setIsWaitingSigning(false);
      close();
    }
  }, [accountData, close]);

  const handleLogin = (provider: string) => {
    if (!sessionKeyBech32) return;
    const redirectUrl = `${API_BASE_URL}/auth/init/${API_KEY}/${provider}/?reference=${sessionKeyBech32}`;
    window.open(redirectUrl, "_blank")?.focus();
    setIsWaitingSigning(true);
  };

  const renderContent = () => {
    if (isWaitingSigning) return <p>Waiting for you to sign-in...</p>;
    if (isLoadingProviders || !sessionKeyBech32) return <p>Loading...</p>;
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
