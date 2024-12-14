import React, {
  Dispatch,
  FC,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import cx from "classnames";

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
import { useSessionIdKeyCache } from "../../utils/localStorage";
import { checkSignin, fetchAuthProviders } from "../../utils/requests";

interface LoginModalProps {
  close: () => void;
  isJoin: boolean;
  isOpen: boolean;
  openNameModal: () => void;
  showActionButtons: () => void;
}

interface ITOU {
  readRules: boolean;
  oldEnough: boolean;
  nonEmployee: boolean;
  privacy: boolean;
}

const providerIcons: { [key: string]: JSX.Element } = {
  wallet: <FaWallet />,
  google: <FaGoogle />,
  twitter: <FaTwitter />,
  discord: <FaDiscord />,
  github: <FaGithub />,
};

const CheckBoxInput: FC<{
  consent: keyof ITOU;
  label: string;
  setTou: Dispatch<SetStateAction<ITOU>>;
  tou: ITOU;
}> = ({ consent, label, tou, setTou }) => {
  return (
    <div className="inline-flex items-start max-w-[600px] justify-start gap-4">
      <input
        type="checkbox"
        checked={tou[consent]}
        onChange={(e) => {
          setTou((prev) => ({
            ...prev,
            [consent]: e.target.checked,
          }));
        }}
        className={cx(
          "appearance-none min-w-4 min-h-4 rounded-sm border-2 border-gray-500 transition-all duration-200 cursor-pointer",
          "checked:bg-yellow-400 checked:shadow-[0_0_6px_2px_rgba(255,223,0,0.08),0_0_15px_4px_rgba(255,223,0,0.15)]",
        )}
        id={consent}
      />
      <label className="text-sm" htmlFor={consent}>
        {label}
      </label>
    </div>
  );
};

const LoginModal: React.FC<LoginModalProps> = ({
  close,
  isJoin,
  isOpen,
  openNameModal,
  showActionButtons,
}) => {
  const shouldShowAllTou = Date.now() >= 1733238000000;
  const [, setSessionId] = useSessionIdKeyCache();
  const { keys, setAccountData, setIsQualified } = useAppContext();
  const { publicKeyHashHex } = keys || {};
  const [isWaitingSigning, setIsWaitingSigning] = useState(false);
  const [tou, setTou] = useState<ITOU>({
    nonEmployee: false,
    oldEnough: false,
    privacy: false,
    readRules: false,
  });
  const [showSelection, setShowSelection] = useState<boolean>(false);
  const requiredTou = useMemo(
    () => (!shouldShowAllTou ? { privacy: tou.privacy } : tou),
    [tou, shouldShowAllTou],
  );

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
      const { account, session, qualifier } = userData;
      setIsWaitingSigning(false);
      close();
      showActionButtons();
      if (account) setAccountData(account);
      if (session?.session_id) setSessionId(session.session_id);
      if (qualifier) setIsQualified(qualifier.is_qualified);
      if (isJoin) openNameModal();
    }
  }, [
    close,
    isJoin,
    openNameModal,
    setAccountData,
    setIsQualified,
    setSessionId,
    showActionButtons,
    userData,
  ]);

  const handleClose = () => {
    if (!isWaitingSigning) {
      close();
    }

    setShowSelection(false);
    setTou({
      nonEmployee: false,
      oldEnough: false,
      privacy: false,
      readRules: false,
    });
  };

  const handleLogin = (provider: string) => {
    if (!publicKeyHashHex) return;
    const redirectUrl = `${API_BASE_URL}/auth/init/${API_KEY}/${provider}/?reference=${publicKeyHashHex}`;
    window.open(redirectUrl, "_blank")?.focus();
    setIsWaitingSigning(true);
  };

  const renderConsentContent = () => {
    return (
      <div className="text-left flex flex-col gap-4">
        <h1 className="text-5xl uppercase mb-6">Tournament Consent</h1>
        {shouldShowAllTou ? (
          <>
            {/**
             * Read the Rules
             */}
            <CheckBoxInput
              consent="readRules"
              label="I confirm that I read, understand and agree to the Hydra Doom Tournament Official Contest Rules."
              tou={tou}
              setTou={setTou}
            />

            {/**
             * Are old enough to play
             */}
            <CheckBoxInput
              consent="oldEnough"
              label="I confirm that I am 18 years of age or older."
              tou={tou}
              setTou={setTou}
            />

            {/**
             * Not an IOG Employee.
             */}
            <CheckBoxInput
              consent="nonEmployee"
              label="I confirm that I am not an employee of Input Output Global, Inc. or
                its subsidiaries, affiliates or other disqualifying entities (as
                more fully described in the Hydra Doom Tournament Official Contest
                Rules), or an immediate family member or person living in the same
                household of the foregoing."
              tou={tou}
              setTou={setTou}
            />
          </>
        ) : null}

        {/**
         * Privacy consent
         */}
        <CheckBoxInput
          consent="privacy"
          label="I understand my information will be securely stored and processed in
            accordance with our Privacy Policy. By providing my information, I
            consent to the collection, use and processing of my information as
            described in this form and in the Hydra Doom Tournament Official
            Contest Rules."
          tou={tou}
          setTou={setTou}
        />
        <Button
          className="place-self-center my-8 w-96 h-16 flex items-center gap-4 capitalize"
          onClick={() => setShowSelection(true)}
          disabled={Object.values(requiredTou).includes(false)}
        >
          Continue
        </Button>
      </div>
    );
  };

  const renderLoginContent = () => {
    if (isWaitingSigning) return <p>Waiting for you to sign-in...</p>;
    if (isLoadingProviders || !publicKeyHashHex) return <p>Loading...</p>;
    if (!providers?.length) return <p>No providers available.</p>;

    return (
      <>
        <h1 className="text-5xl uppercase">Tournament Login</h1>
        <p className="mb-4">
          Please select a provider to login with. If you don't have an account
          you can create one with the provider of your choice.
        </p>
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
      </>
    );
  };

  return (
    <Modal isOpen={isOpen} close={handleClose}>
      <div className="text-center text-4xl flex flex-col gap-8 py-4">
        {showSelection ? renderLoginContent() : renderConsentContent()}
      </div>
    </Modal>
  );
};

export default LoginModal;
