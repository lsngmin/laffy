import { fetchAdsterraJson } from '@/utils/adsterraClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  if (!token) {
    return res.status(400).json({ error: 'Missing Adsterra API token.' });
  }

  try {
    const data = await fetchAdsterraJson('/domains.json', token);
    const domains = Array.isArray(data?.items)
      ? data.items.map((item) => ({
          id: String(item?.id ?? ''),
          title: item?.title || '',
        }))
      : [];
    return res.status(200).json({ domains });
  } catch (error) {
    return res.status(error.status || 502).json({ error: error.message || 'Failed to load domains.' });
  }
}

export const config = {
  runtime: 'nodejs',
};
