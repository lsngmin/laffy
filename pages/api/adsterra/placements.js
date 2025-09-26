import { fetchAdsterraJson } from '@/utils/adsterraClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  const domainId = typeof req.body?.domainId === 'string' ? req.body.domainId.trim() : '';

  if (!token) {
    return res.status(400).json({ error: 'Missing Adsterra API token.' });
  }
  if (!domainId) {
    return res.status(400).json({ error: 'Missing domain id.' });
  }

  try {
    const data = await fetchAdsterraJson(`/domain/${domainId}/placements.json`, token);
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
