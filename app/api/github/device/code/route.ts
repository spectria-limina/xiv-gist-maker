export async function POST() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return Response.json({ error: 'GitHub OAuth not configured' }, { status: 503 });
  }
  const res = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({ client_id: clientId, scope: 'gist' }),
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
