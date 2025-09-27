async function parseBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  if (!chunks.length) return null;
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (error) {
    return null;
  }
}

const MAX_EVENTS_PER_BATCH = 10;

function normalizeEvents(rawEvents) {
  if (!Array.isArray(rawEvents)) return [];
  return rawEvents
    .slice(0, MAX_EVENTS_PER_BATCH)
    .map((event) => {
      if (!event || typeof event !== 'object') return null;
      const name = typeof event.name === 'string' ? event.name.trim() : '';
      if (!name) return null;
      const props = event.props && typeof event.props === 'object' ? event.props : {};
      const slug = typeof event.slug === 'string' ? event.slug.trim() : '';
      const ts = Number(event.ts);
      const timestamp = Number.isFinite(ts) ? ts : Date.now();
      return {
        name,
        props,
        slug,
        ts: timestamp,
        sessionId: typeof event.sessionId === 'string' ? event.sessionId.trim() : '',
        value: Number.isFinite(Number(event.value)) ? Number(event.value) : undefined,
      };
    })
    .filter(Boolean);
}

function extractContext(req) {
  const forwarded = typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'] : '';
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket?.remoteAddress || '';
  const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : '';
  const referer = typeof req.headers.referer === 'string' ? req.headers.referer : '';
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
  return { ip, userAgent, referer, origin };
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '256kb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = await parseBody(req);
    if (!body) {
      return res.status(400).json({ error: '잘못된 요청 본문입니다.' });
    }

    const events = normalizeEvents(body.events);
    if (!events.length) {
      return res.status(200).json({ ok: true, ingested: 0 });
    }

    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
    const context = { ...extractContext(req), sessionId, receivedAt: Date.now() };

    const { ingestEvents } = await import('../../../utils/eventsStore');
    const result = await ingestEvents(events, context);

    return res.status(200).json({ ok: true, ingested: result.ingested || 0 });
  } catch (error) {
    console.error('[events] ingest failed', error);
    return res.status(500).json({ error: '이벤트를 저장하지 못했어요.' });
  }
}
