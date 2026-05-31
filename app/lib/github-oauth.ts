import { OAuth2Client, CodeChallengeMethod } from "arctic";

export { CodeChallengeMethod };

export const GITHUB_API = "https://api.github.com";
export const GITHUB_API_VERSION = "2026-03-10";
const AUTHORIZATION_ENDPOINT = "https://github.com/login/oauth/authorize";
export const TOKEN_ENDPOINT = "https://github.com/login/oauth/access_token";

export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // Unix ms timestamp
}

export function getSiteOrigin(): string {
  if (!process.env.SITE_DOMAIN) throw new Error("SITE_DOMAIN must be set");
  const scheme = process.env.SITE_DOMAIN.startsWith("localhost")
    ? "http"
    : "https";
  return `${scheme}://${process.env.SITE_DOMAIN}`;
}

export function getCallbackURL(): string {
  return `${getSiteOrigin()}/api/auth/callback/github`;
}

type ArcticTokens = Awaited<
  ReturnType<OAuth2Client["validateAuthorizationCode"]>
>;

export function tokenDataFromResponse(tokens: ArcticTokens): TokenData {
  let expiresAt: number | undefined;
  try {
    expiresAt = tokens.accessTokenExpiresAt().getTime();
  } catch {
    /* no expiry in response */
  }
  return {
    accessToken: tokens.accessToken(),
    refreshToken: tokens.hasRefreshToken() ? tokens.refreshToken() : undefined,
    expiresAt,
  };
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

export async function revokeGitHubToken(token: string): Promise<void> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId) throw new Error("GITHUB_CLIENT_ID must be set");
  if (!clientSecret) throw new Error("GITHUB_CLIENT_SECRET must be set");
  const auth = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
  await fetch(`${GITHUB_API}/applications/${clientId}/token`, {
    method: "DELETE",
    headers: {
      Authorization: auth,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
    },
    body: JSON.stringify({ access_token: token }),
  });
}

export async function refreshGitHubToken(
  refreshToken: string,
): Promise<TokenData> {
  const client = createGitHubOAuthClient(getCallbackURL());
  const tokens = await client.refreshAccessToken(TOKEN_ENDPOINT, refreshToken, [
    "gist",
  ]);
  return tokenDataFromResponse(tokens);
}
