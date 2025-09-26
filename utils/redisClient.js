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

function resolveRequestConfig(options = {}) {
  const { allowReadOnly = false } = options;
  const { url, token, readOnlyToken } = resolveCredentials();
  const authToken = token || (allowReadOnly ? readOnlyToken : null);
  if (!url || !authToken) throw new Error('Upstash not configured');
  return { url, authToken };
}

async function executeRedisRequest(endpoint, payload, authToken) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Upstash request failed (${res.status}): ${errorText}`);
  }
  return res.json();
}

export async function redisCommand(command, options = {}) {
  const { url, authToken } = resolveRequestConfig(options);
  const data = await executeRedisRequest(url, command, authToken);
  return data.result;
}

export async function redisBatch(commands, options = {}) {
  if (!Array.isArray(commands) || commands.length === 0) return [];
  const normalized = commands.filter((cmd) => Array.isArray(cmd) && cmd.length > 0);
  if (normalized.length === 0) return [];

  if (normalized.length === 1) {
    const [single] = normalized;
    const result = await redisCommand(single, options);
    return [{ result }];
  }

  const { url, authToken } = resolveRequestConfig(options);
  const endpoint = `${url}/pipeline`;
  const data = await executeRedisRequest(endpoint, normalized, authToken);
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data?.result)) {
    return data.result;
  }
  throw new Error('Invalid Upstash pipeline response');
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
