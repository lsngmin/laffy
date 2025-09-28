const SUPABASE_URL = typeof process !== 'undefined' && process.env?.SUPABASE_URL ? process.env.SUPABASE_URL.trim() : '';
const SUPABASE_SERVICE_ROLE_KEY =
  typeof process !== 'undefined' && process.env?.SUPABASE_SERVICE_ROLE_KEY
    ? process.env.SUPABASE_SERVICE_ROLE_KEY.trim()
    : '';

export function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function baseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    ...extra,
  };
}

export async function callSupabaseRpc(functionName, payload = {}) {
  if (!hasSupabaseConfig()) {
    throw new Error('Supabase is not configured');
  }
  const url = `${SUPABASE_URL}/rest/v1/rpc/${functionName}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: baseHeaders({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Supabase RPC ${functionName} failed (${response.status}): ${errorText}`);
  }

  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}

export async function supabaseRest(path, { method = 'GET', headers = {}, body } = {}) {
  if (!hasSupabaseConfig()) {
    throw new Error('Supabase is not configured');
  }

  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const init = {
    method,
    headers: baseHeaders({
      Accept: 'application/json',
      ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    }),
  };

  if (body !== undefined) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(url, init);
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Supabase REST request failed (${response.status}): ${errorText}`);
  }

  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}

export const SUPABASE_EVENTS_ROLLUP_FUNCTION = process.env?.SUPABASE_EVENTS_ROLLUP_FUNCTION?.trim() || 'ingest_events_daily';
export const SUPABASE_EVENTS_ROLLUP_TABLE = process.env?.SUPABASE_EVENTS_ROLLUP_TABLE?.trim() || 'events_daily_rollups';
