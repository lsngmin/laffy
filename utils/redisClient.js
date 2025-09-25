function resolveCredentials() {
  const url = process.env.UPSTASH_REDIS_REST_URL
    || process.env.KV_REST_API_URL
    || process.env.KV_URL
    || null;

  const token = process.env.UPSTASH_REDIS_REST_TOKEN
    || process.env.KV_REST_API_TOKEN
    || null;

  const readOnlyToken = process.env.KV_REST_API_READ_ONLY_TOKEN || null;

  return {
    url,
    token,
    readOnlyToken,
  };
}

export function hasUpstash() {
  const { url, token } = resolveCredentials();
  return Boolean(url && token);
}

export async function redisCommand(command, options = {}) {
  const { allowReadOnly = false } = options;
  const { url, token, readOnlyToken } = resolveCredentials();
  const authToken = token || (allowReadOnly ? readOnlyToken : null);
  if (!url || !authToken) throw new Error('Upstash not configured');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ command })
  });
  if (!res.ok) throw new Error('Upstash request failed');
  const data = await res.json();
  return data.result;
}
