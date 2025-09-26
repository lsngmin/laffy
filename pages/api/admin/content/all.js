import { assertAdmin } from '../_auth';
import { getAllContent } from '@/utils/contentSource';

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && typeof item.slug === 'string' && item.slug.trim())
    .map((item) => {
      const slug = item.slug.trim();
      const type = typeof item.type === 'string' ? item.type : '';
      const routePath = type === 'image' ? `/x/${slug}` : `/m/${slug}`;
      return {
        ...item,
        slug,
        type,
        routePath,
      };
    });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!assertAdmin(req, res)) {
    return;
  }

  try {
    const { items } = await getAllContent();
    const normalized = normalizeItems(items);
    return res.status(200).json({ items: normalized, count: normalized.length });
  } catch (error) {
    console.error('[admin][content][all] failed to load content index', error);
    return res.status(500).json({ error: 'Failed to load full content index' });
  }
}
