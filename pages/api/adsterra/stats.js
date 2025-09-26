import { fetchAdsterraJson } from '@/utils/adsterraClient';

function buildStatsEndpoint({ domainId, placementId, startDate, endDate, groupBy = ['date'] }) {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('finish_date', endDate);
  if (domainId) params.append('domain', domainId);

  const groupValues = Array.isArray(groupBy) && groupBy.length ? groupBy : ['date'];
  groupValues.forEach((value) => {
    if (value) params.append('group_by[]', value);
  });

  if (placementId) {
    params.append('placement_ids[]', placementId);
  }

  const query = params.toString();
  return `/stats.json${query ? `?${query}` : ''}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  const domainId = typeof req.body?.domainId === 'string' ? req.body.domainId.trim() : '';
  const placementId = typeof req.body?.placementId === 'string' ? req.body.placementId.trim() : '';
  const startDate = typeof req.body?.startDate === 'string' ? req.body.startDate.trim() : '';
  const endDate = typeof req.body?.endDate === 'string' ? req.body.endDate.trim() : '';
  const groupBy = Array.isArray(req.body?.groupBy) ? req.body.groupBy : undefined;

  if (!token) {
    return res.status(400).json({ error: 'Missing Adsterra API token.' });
  }
  if (!domainId) {
    return res.status(400).json({ error: 'Missing domain id.' });
  }
  if (!placementId) {
    return res.status(400).json({ error: 'Missing placement id.' });
  }
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Both start and end dates are required.' });
  }

  try {
    const endpoint = buildStatsEndpoint({ domainId, placementId, startDate, endDate, groupBy });
    const data = await fetchAdsterraJson(endpoint, token);
    const items = Array.isArray(data?.items) ? data.items : [];
    const normalizedItems = [];

    items.forEach((entry) => {
      if (!entry || typeof entry !== 'object') {
        return;
      }

      if (Array.isArray(entry?.items)) {
        normalizedItems.push(...entry.items);
        return;
      }

      if (entry?.value && Array.isArray(entry.value.items)) {
        normalizedItems.push(...entry.value.items);
        return;
      }

      normalizedItems.push(entry);
    });

    const itemCount = Number.isFinite(Number(data?.itemCount))
      ? Number(data.itemCount)
      : normalizedItems.length || items.length;
    return res.status(200).json({
      items: normalizedItems.length ? normalizedItems : items,
      itemCount,
      raw: data,
    });
  } catch (error) {
    return res.status(error.status || 502).json({ error: error.message || 'Failed to load statistics.' });
  }
}

export const config = {
  runtime: 'nodejs',
};
