import { assertAdmin } from './_auth';

function resolveActor(req) {
  const headerActor = typeof req.headers['x-admin-user'] === 'string' ? req.headers['x-admin-user'].trim() : '';
  const bodyActor = typeof req.body?.actor === 'string' ? req.body.actor.trim() : '';
  const queryActor = typeof req.query.actor === 'string' ? req.query.actor.trim() : '';
  return headerActor || bodyActor || queryActor || 'unknown';
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).end();
  }
  if (!assertAdmin(req, res)) return;

  if (req.method === 'GET') {
    try {
      const { limit } = req.query;
      const querySlugs = [];
      if (Array.isArray(req.query.slug)) querySlugs.push(...req.query.slug);
      if (typeof req.query.slug === 'string') querySlugs.push(req.query.slug);
      if (typeof req.query.slugs === 'string') querySlugs.push(...req.query.slugs.split(','));
      const slugs = querySlugs.map((slug) => slug.trim()).filter(Boolean);
      const { listMetricsAudit } = await import('../../../utils/metricsAuditLog');
      const logs = await listMetricsAudit({ slugs, limit: limit ? Number(limit) : undefined });
      return res.status(200).json({ logs });
    } catch (error) {
      console.error('[admin:metrics] Failed to fetch audit logs', error);
      return res.status(500).json({ error: 'Failed to load audit log' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { normalizeMetricUpdates, applyMetricUpdates } = await import('../../../utils/metricsAdminHelpers');
      const { targets, errors } = normalizeMetricUpdates(req.body || {});

      if (errors.length) {
        return res.status(400).json({ error: 'Invalid metrics payload', details: errors });
      }

      if (!targets.length) {
        return res.status(400).json({ error: '업데이트할 메트릭이 없습니다.' });
      }

      const actor = resolveActor(req);
      const { results } = await applyMetricUpdates({ targets, actor });
      return res.status(200).json({ results });
    } catch (error) {
      console.error('[admin:metrics] Failed to update metrics', error);
      return res.status(500).json({ error: 'Failed to update metrics' });
    }
  }
}
