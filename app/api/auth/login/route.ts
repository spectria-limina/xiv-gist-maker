import { generateState, generateCodeVerifier } from 'arctic';
import { cookies } from 'next/headers';
import { createGitHubOAuthClient, createAuthorizationURL, getSiteOrigin } from '@/app/lib/github-oauth';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: (process.env.NODE_ENV !== 'development'),
  sameSite: 'lax' as const,
  maxAge: 60 * 10,
  path: '/',
};

export async function GET(_request: Request) {
  const origin = getSiteOrigin();
  const client = createGitHubOAuthClient(`${origin}/api/auth/callback/github`);
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const authURL = createAuthorizationURL(client, state, codeVerifier);

  const jar = await cookies();
  jar.set('oauth_state', state, COOKIE_OPTS);
  jar.set('oauth_code_verifier', codeVerifier, COOKIE_OPTS);

  return Response.redirect(authURL);
}
