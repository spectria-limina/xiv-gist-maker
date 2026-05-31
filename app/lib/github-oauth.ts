import { OAuth2Client, CodeChallengeMethod } from "arctic";

export { CodeChallengeMethod };

const GITHUB_API_VERSION = "2026-03-10";

export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // Unix ms timestamp
}

export function getSiteOrigin(): string {
  if (!process.env.SITE_DOMAIN) throw new Error("SITE_DOMAIN must be set");
  const scheme =
    process.env.SITE_DOMAIN.startsWith("localhost") ? "http" : "https";
  return `${scheme}://${process.env.SITE_DOMAIN}`;
}

export async function revokeGitHubToken(token: string): Promise<void> {
  if (!process.env.GITHUB_CLIENT_ID)
    throw new Error("GITHUB_CLIENT_ID must be set");
  if (!process.env.GITHUB_CLIENT_SECRET)
    throw new Error("GITHUB_CLIENT_SECRET must be set");
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const auth = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;

  if (!clientId || !clientSecret) return;
  await fetch(tokenRevocationEndpoint(), {
    method: "DELETE",
    headers: {
      Authorization: auth,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
    },
    body: JSON.stringify({ access_token: token }),
  });
}

export async function refreshGitHubToken(refreshToken: string): Promise<TokenData> {
  const origin = getSiteOrigin();
  const client = createGitHubOAuthClient(`${origin}/api/auth/callback/github`);
  const tokens = await client.refreshAccessToken(TOKEN_ENDPOINT, refreshToken, ["gist"]);
  let expiresAt: number | undefined;
  try { expiresAt = tokens.accessTokenExpiresAt().getTime(); } catch { /* no expiry in response */ }
  return {
    accessToken: tokens.accessToken(),
    refreshToken: tokens.hasRefreshToken() ? tokens.refreshToken() : undefined,
    expiresAt,
  };
}

const AUTHORIZATION_ENDPOINT = "https://github.com/login/oauth/authorize";
export const TOKEN_ENDPOINT = "https://github.com/login/oauth/access_token";

function tokenRevocationEndpoint(): string {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!process.env.GITHUB_CLIENT_ID)
    throw new Error("GITHUB_CLIENT_ID must be set");
  return `https://api.github.com/applications/${clientId}/token`;
}

export function createGitHubOAuthClient(redirectURI: string): OAuth2Client {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be set");
  }
  return new OAuth2Client(clientId, clientSecret, redirectURI);
}

export function createAuthorizationURL(
  client: OAuth2Client,
  state: string,
  codeVerifier: string,
): URL {
  return client.createAuthorizationURLWithPKCE(
    AUTHORIZATION_ENDPOINT,
    state,
    CodeChallengeMethod.S256,
    codeVerifier,
    ["gist"],
  );
}
