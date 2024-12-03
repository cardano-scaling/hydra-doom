import { API_BASE_URL, API_KEY } from "../constants";
import { AuthResponse, GameStatistics, SessionStatsInterface } from "../types";

export const fetchAuthProviders = async (): Promise<string[]> => {
  const response = await fetch(`${API_BASE_URL}/auth/providers`);
  if (!response.ok) {
    throw new Error("Failed to fetch auth providers");
  }
  return response.json();
};

export const checkSignin = async (
  publicKeyHex: string,
): Promise<AuthResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/auth/check/${API_KEY}/?reference=${publicKeyHex}`,
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

export const authRefresh = async ({
  newReference,
  sessionId,
}: {
  newReference: string;
  sessionId: string;
}): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/refresh/${API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      new_reference: newReference,
      session_id: sessionId,
    }),
  });
  if (!response.ok) {
    throw new Error("Failed to refresh auth");
  }
  return response.json();
};

export const fetchSessionStats = async (
  sessionReference: string,
): Promise<SessionStatsInterface> => {
  const response = await fetch(
    `${API_BASE_URL}/stats/session/${API_KEY}/${sessionReference}`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch session stats");
  }
  return response.json();
};
