import { assertAdmin } from './_auth';
import { getHeatmapSnapshot } from '../../../utils/heatmapStore';

const DEFAULT_GRID_COLS = 12;

function normalizeSlugInput(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/^\/+/, '');
}

function buildSlugVariants(value) {
  const normalized = normalizeSlugInput(value);
  if (!normalized) return [];
  const base = normalized.startsWith('x/') ? normalized.slice(2) : normalized;
  const variants = new Set();
  variants.add(normalized);
  if (base) {
    variants.add(base);
    variants.add(`x/${base}`);
  }
  return Array.from(variants);
}

function mergeSnapshots(snapshots) {
  const bucketMap = new Map();
  snapshots.forEach((snapshot) => {
    if (!snapshot || !Array.isArray(snapshot.buckets)) return;
    snapshot.buckets.forEach((bucket) => {
      if (!bucket) return;
      const bucketName =
        typeof bucket.bucket === 'string' && bucket.bucket ? bucket.bucket : 'default';
      const cells = Array.isArray(bucket.cells) ? bucket.cells : [];
      const cellMap = bucketMap.get(bucketName) || new Map();
      cells.forEach((cell) => {
        const index = Number(cell?.cell);
        if (!Number.isFinite(index) || index < 0) return;
        const count = Number(cell?.count);
        if (!Number.isFinite(count) || count <= 0) return;
        const section = typeof cell?.section === 'string' && cell.section ? cell.section : 'root';
        const type = typeof cell?.type === 'string' && cell.type ? cell.type : 'generic';
        const key = `${section}|${type}|${index}`;
        const current = cellMap.get(key) || { cell: index, section, type, count: 0 };
        current.count += Math.round(count);
        cellMap.set(key, current);
      });
      bucketMap.set(bucketName, cellMap);
    });
  });
  return Array.from(bucketMap.entries()).map(([bucket, cellMap]) => ({
    bucket,
    cells: Array.from(cellMap.values()),
  }));
}

function transformBucket(rawBucket) {
  const bucketName = typeof rawBucket?.bucket === 'string' && rawBucket.bucket ? rawBucket.bucket : 'default';
  const rawCells = Array.isArray(rawBucket?.cells) ? rawBucket.cells : [];

  if (rawCells.length === 0) {
    return {
      bucket: bucketName,
      totalCount: 0,
      maxCount: 0,
      grid: { cols: DEFAULT_GRID_COLS, rows: 0 },
      matrix: [],
      cells: [],
      sections: [],
      types: [],
      topCells: [],
    };
  }

  let maxCellIndex = 0;
  for (const entry of rawCells) {
    const idx = Number(entry?.cell);
    if (Number.isFinite(idx) && idx > maxCellIndex) {
      maxCellIndex = idx;
    }
  }

  const rows = Math.max(1, Math.ceil((maxCellIndex + 1) / DEFAULT_GRID_COLS));
  const matrix = Array.from({ length: rows }, () => Array.from({ length: DEFAULT_GRID_COLS }, () => 0));

  let total = 0;
  let maxCount = 0;
  const details = [];
  const sectionMap = new Map();
  const typeMap = new Map();

  for (const entry of rawCells) {
    const idx = Number(entry?.cell);
    const count = Number(entry?.count);
    if (!Number.isFinite(idx) || idx < 0) continue;
    if (!Number.isFinite(count) || count <= 0) continue;
    const section = typeof entry?.section === 'string' && entry.section ? entry.section : 'root';
    const type = typeof entry?.type === 'string' && entry.type ? entry.type : 'generic';
    const row = Math.floor(idx / DEFAULT_GRID_COLS);
    const column = idx % DEFAULT_GRID_COLS;
    if (row >= rows || column >= DEFAULT_GRID_COLS) continue;

    matrix[row][column] += count;
    total += count;
    if (count > maxCount) maxCount = count;

    const detail = {
      cell: idx,
      row,
      column,
      rowLabel: row + 1,
      columnLabel: column + 1,
      section,
      type,
      count,
    };

    details.push(detail);
    sectionMap.set(section, (sectionMap.get(section) || 0) + count);
    typeMap.set(type, (typeMap.get(type) || 0) + count);
  }

  const safeTotal = total > 0 ? total : 0;
  const decoratedDetails = details
    .map((detail) => ({
      ...detail,
      ratio: safeTotal > 0 ? detail.count / safeTotal : 0,
      intensity: maxCount > 0 ? detail.count / maxCount : 0,
    }))
    .sort((a, b) => a.cell - b.cell);

  const sections = Array.from(sectionMap.entries())
    .map(([section, count]) => ({
      section,
      count,
      ratio: safeTotal > 0 ? count / safeTotal : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const types = Array.from(typeMap.entries())
    .map(([type, count]) => ({
      type,
      count,
      ratio: safeTotal > 0 ? count / safeTotal : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const topCells = decoratedDetails
    .slice()
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    bucket: bucketName,
    totalCount: safeTotal,
    maxCount,
    grid: { cols: DEFAULT_GRID_COLS, rows },
    matrix,
    cells: decoratedDetails,
    sections,
    types,
    topCells,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }

  if (!assertAdmin(req, res)) {
    return;
  }

  const rawSlug = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug;
  const normalizedSlug = normalizeSlugInput(rawSlug);
  if (!normalizedSlug) {
    return res.status(400).json({ error: 'Missing slug' });
  }

  try {
    const variants = buildSlugVariants(normalizedSlug);
    if (!variants.length) {
      return res.status(400).json({ error: 'Missing slug' });
    }

    const snapshots = await Promise.all(
      variants.map(async (variant) => {
        try {
          return await getHeatmapSnapshot(variant);
        } catch (error) {
          console.warn(`[admin][heatmap] failed to load variant ${variant}`, error);
          return { slug: variant, buckets: [] };
        }
      })
    );

    const merged = mergeSnapshots(snapshots);
    const buckets = merged.map((bucket) => transformBucket(bucket));

    const totalSamples = buckets.reduce((acc, bucket) => acc + (bucket.totalCount || 0), 0);

    return res.status(200).json({
      ok: true,
      slug: normalizedSlug,
      sources: variants,
      generatedAt: new Date().toISOString(),
      buckets,
      bucketCount: buckets.length,
      totalSamples,
    });
  } catch (error) {
    console.error('[admin][heatmap] failed to load snapshot', error);
    return res.status(500).json({ error: 'Failed to load heatmap snapshot' });
  }
}
