import { fetchAdsterraJson } from '@/utils/adsterraClient';

const TARGET_DOMAIN_ID = (process.env.ADSTERRA_STATS_DOMAIN_ID || process.env.ADSTERRA_DOMAIN_ID || '5609169').trim();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = await fetchAdsterraJson('/domains.json');
    const domains = Array.isArray(data?.items)
      ? data.items
          .filter((item) => String(item?.id ?? '') === TARGET_DOMAIN_ID)
          .map((item) => ({
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
