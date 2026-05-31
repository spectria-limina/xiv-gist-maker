import { OAuth2RequestError } from 'arctic';
import { cookies } from 'next/headers';
import { createGitHubOAuthClient, TOKEN_ENDPOINT, getSiteOrigin, type TokenData } from '@/app/lib/github-oauth';
import { setTokenCookie } from '@/app/lib/token-cookie';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = getSiteOrigin();
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const jar = await cookies();
  const storedState = jar.get('oauth_state')?.value;
  const codeVerifier = jar.get('oauth_code_verifier')?.value;

  jar.delete('oauth_state');
  jar.delete('oauth_code_verifier');

  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    return Response.redirect(new URL('/?error=Invalid auth callback', origin));
  }

  const client = createGitHubOAuthClient(`${origin}/api/auth/callback/github`);
  try {
    const tokens = await client.validateAuthorizationCode(TOKEN_ENDPOINT, code, codeVerifier);
    let expiresAt: number | undefined;
    try { expiresAt = tokens.accessTokenExpiresAt().getTime(); } catch { /* no expiry in response */ }
    const tokenData: TokenData = {
      accessToken: tokens.accessToken(),
      refreshToken: tokens.hasRefreshToken() ? tokens.refreshToken() : undefined,
      expiresAt,
    };
    await setTokenCookie(tokenData);
    // Use a client-side redirect instead of a server 302 to break the cross-site
    // redirect chain (github.com → callback → /). A 302 here causes browsers to
    // omit SameSite=Strict cookies on the tail hop; a JS navigation starts fresh.
    return new Response(
      `<!DOCTYPE html><html><head><title>Signing in…</title><meta http-equiv="refresh" content="0;url=/"></head>` +
      `<body><script>window.location.replace("/")</script></body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  } catch (e) {
    const errorCode = e instanceof OAuth2RequestError ? e.code : 'server_error';
    return Response.redirect(new URL(`/?error=${encodeURIComponent(errorCode)}`, origin));
  }
}
