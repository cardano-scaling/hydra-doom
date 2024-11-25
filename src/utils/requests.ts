import { API_BASE_URL, API_KEY } from "../constants";
import { AuthResponse, GameStatistics } from "../types";

export const fetchAuthProviders = async (): Promise<string[]> => {
  const response = await fetch(`${API_BASE_URL}/auth/providers`);
  if (!response.ok) {
    throw new Error("Failed to fetch auth providers");
  }
  return response.json();
};

export const checkSignin = async (
  sessionKeyBech32: string,
): Promise<AuthResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/auth/check/${API_KEY}/?reference=${sessionKeyBech32}`,
  );
  if (!response.ok) {
    throw new Error("Failed to check sign-in status");
  }
  return response.json();
};

export const fetchGlobalStats = async (
  region: string,
): Promise<GameStatistics> => {
  const response = await fetch(
    `https://api.${region}.hydra-doom.sundae.fi/global_stats`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch global stats");
  }
  return response.json();
};
