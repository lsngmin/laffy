import { assertAdmin } from './_auth';
import { applyRateLimit, setRateLimitHeaders } from '../../../utils/apiRateLimit';
import { supabaseRest } from '../../../utils/supabaseClient';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function clampLimit(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.round(numeric)));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!assertAdmin(req, res)) {
    return;
  }

  const rate = applyRateLimit(req, 'admin:x_visit:raw', { limit: 45, windowMs: 60_000 });
  setRateLimitHeaders(res, rate);
  if (!rate.ok) {
    return res.status(429).json({ error: '요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.' });
  }

  try {
    const slugRaw = typeof req.query.slug === 'string' ? req.query.slug.trim() : '';
    const limitValue = clampLimit(req.query.limit);
    const params = new URLSearchParams();
    params.set('select', 'id,ts,slug,session_id,payload');
    params.set('event_name', 'eq.x_visit');
    params.set('order', 'ts.desc');
    params.set('limit', String(limitValue));
    if (slugRaw) {
      params.set('slug', `eq.${slugRaw}`);
    }

    const rows = await supabaseRest(`events_raw?${params.toString()}`, {
      headers: { Prefer: 'return=representation' },
    });

    const items = Array.isArray(rows)
      ? rows.map((row) => ({
          id: row.id,
          ts: row.ts,
          slug: row.slug,
          sessionId: row.session_id,
          payload: row.payload,
        }))
      : [];

    return res.status(200).json({
      ok: true,
      items,
    });
  } catch (error) {
    console.error('[admin][x_visit] failed to fetch raw events', error);
    return res.status(500).json({ error: '방문 로그를 불러오지 못했어요.' });
  }
}
