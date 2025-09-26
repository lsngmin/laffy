import { fetchAdsterraJson } from '@/utils/adsterraClient';

const TARGET_DOMAIN_ID = (process.env.ADSTERRA_STATS_DOMAIN_ID || process.env.ADSTERRA_DOMAIN_ID || '5609169').trim();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const domainId = typeof req.body?.domainId === 'string' ? req.body.domainId.trim() : '';

  if (!domainId) {
    return res.status(400).json({ error: 'Missing domain id.' });
  }
  if (domainId !== TARGET_DOMAIN_ID) {
    return res.status(403).json({ error: 'Unsupported domain id.' });
  }

  try {
    const data = await fetchAdsterraJson(`/domain/${domainId}/placements.json`);
    const placements = Array.isArray(data?.items)
      ? data.items.map((item) => ({
          id: String(item?.id ?? ''),
          title: item?.title || '',
          alias: item?.alias || '',
          directUrl: item?.direct_url || '',
        }))
      : [];
    return res.status(200).json({ placements });
  } catch (error) {
    return res.status(error.status || 502).json({ error: error.message || 'Failed to load placements.' });
  }
}

export const config = {
  runtime: 'nodejs',
};
