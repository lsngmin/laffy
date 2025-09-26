import { ensureViewerId } from '../../../utils/viewerSession';
import { logEvents } from '../../../utils/eventsStore';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  if (!buffer.length) return null;
  const text = buffer.toString('utf8');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function normalizeEvents(payload) {
  if (!payload) return [];
  if (Array.isArray(payload.events)) {
    return payload.events;
  }
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload.name) {
    return [payload];
  }
  return [];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = await readBody(req);
    const events = normalizeEvents(body);
    if (!events.length) {
      return res.status(400).json({ error: '이벤트 페이로드가 비어있어요.' });
    }

    const viewerId = ensureViewerId(req, res);
    await logEvents(events, { viewerId });

    return res.status(204).end();
  } catch (error) {
    console.error('[events:ingest] Failed to log events', error);
    return res.status(500).json({ error: '이벤트를 기록하는 중 오류가 발생했어요.' });
  }
}
