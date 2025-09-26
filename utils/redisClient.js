const REST_URL_KEYS = [
  'UPSTASH_REDIS_REST_URL',
  'KV_REST_API_URL',
  'REDIS_REST_URL',
];

const REST_TOKEN_KEYS = [
  'UPSTASH_REDIS_REST_TOKEN',
  'KV_REST_API_TOKEN',
  'REDIS_REST_TOKEN',
];

const REST_READONLY_TOKEN_KEYS = [
  'KV_REST_API_READ_ONLY_TOKEN',
  'REDIS_REST_API_READ_ONLY_TOKEN',
];

function pickEnv(keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      const trimmed = value.trim();
      const unquoted = trimmed.replace(/^['"]|['"]$/g, '');
      return unquoted;
    }
  }
  return null;
}

function isRestUrl(value) {
  if (!value) return false;
  return value.startsWith('https://') || value.startsWith('http://');
}

function resolveCredentials() {
  const rawUrl = pickEnv(REST_URL_KEYS);
  const url = isRestUrl(rawUrl) ? rawUrl : null;

  const token = pickEnv(REST_TOKEN_KEYS);
  const readOnlyToken = pickEnv(REST_READONLY_TOKEN_KEYS);

  return { url, token, readOnlyToken };
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
    body: JSON.stringify(command)
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Upstash request failed (${res.status}): ${errorText}`);
  }
  const data = await res.json();
  return data.result;
}

export async function redisEval(script, keys = [], args = [], options = {}) {
  const keyCount = Array.isArray(keys) ? keys.length : 0;
  const command = [
    'EVAL',
    script,
    String(keyCount),
    ...keys,
    ...args.map((arg) => (typeof arg === 'string' ? arg : String(arg))),
  ];
  return redisCommand(command, options);
}
