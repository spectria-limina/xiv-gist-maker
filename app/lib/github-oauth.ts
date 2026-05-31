import { OAuth2Client, CodeChallengeMethod } from 'arctic';

export { CodeChallengeMethod };

export function getSiteOrigin(request: Request): string {
  if (process.env.SITE_DOMAIN) return `https://${process.env.SITE_DOMAIN}`;
  return new URL(request.url).origin;
}

const AUTHORIZATION_ENDPOINT = 'https://github.com/login/oauth/authorize';
export const TOKEN_ENDPOINT = 'https://github.com/login/oauth/access_token';

export function createGitHubOAuthClient(redirectURI: string): OAuth2Client {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be set');
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
    ['gist'],
  );
}
