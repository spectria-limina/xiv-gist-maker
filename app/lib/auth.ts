import { refreshGitHubToken } from "./github-oauth";
import { getTokenData, setTokenCookie } from "./token-cookie";

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh 5 min before expiry

export async function getAuthToken(): Promise<string | null> {
  const data = await getTokenData();
  if (!data) return null;

  if (
    data.refreshToken &&
    data.expiresAt &&
    Date.now() >= data.expiresAt - REFRESH_BUFFER_MS
  ) {
    try {
      const newData = await refreshGitHubToken(data.refreshToken);
      await setTokenCookie(newData);
      return newData.accessToken;
    } catch (err) {
      console.warn("Token refresh failed, falling back to current token:", err);
      // The API call may fail if the token has already expired, which the caller handles.
    }
  }

  return data.accessToken;
}
