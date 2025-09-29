import { assertAdmin } from '../_auth';
import { applyRateLimit, setRateLimitHeaders } from '../../../../utils/apiRateLimit';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!assertAdmin(req, res)) {
    return;
  }

  const rate = applyRateLimit(req, 'admin:events:flush', { limit: 30, windowMs: 60_000 });
  setRateLimitHeaders(res, rate);
  if (!rate.ok) {
    return res.status(429).json({ error: '요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.' });
  }

  try {
    const bodyBatch = req.body && Object.prototype.hasOwnProperty.call(req.body, 'batchSize') ? req.body.batchSize : undefined;
    const batchSizeRaw = bodyBatch ?? req.query?.batchSize;
    const batchSize = Number.isFinite(Number(batchSizeRaw)) ? Number(batchSizeRaw) : undefined;
    const { flushVisitEvents } = await import('../../../../utils/eventsStore');
    const result = await flushVisitEvents({ batchSize });
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    console.error('[admin][events] flush failed', error);
    return res.status(500).json({ error: '이벤트 큐를 비우지 못했어요.' });
  }
}
