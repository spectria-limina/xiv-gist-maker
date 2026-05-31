import { setTokenCookie } from '@/app/lib/token-cookie';

export async function POST(request: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return Response.json({ error: 'GitHub OAuth not configured' }, { status: 503 });
  }
  const body = await request.json().catch(() => null);
  const device_code = body?.device_code;
  if (!device_code || typeof device_code !== 'string') {
    return Response.json({ error: 'device_code required' }, { status: 400 });
  }
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      client_id: clientId,
      device_code,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    }),
  });
  const data = await res.json();
  if (data.access_token) {
    await setTokenCookie(data.access_token);
    return Response.json({ success: true });
  }
  return Response.json(
    { error: data.error, error_description: data.error_description },
    { status: res.status },
  );
}
