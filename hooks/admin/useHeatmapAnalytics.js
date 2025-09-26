import { useCallback, useEffect, useMemo, useState } from 'react';

const DEFAULT_GRID = Object.freeze({ cols: 12, rows: 8 });

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatBucketLabel(value) {
  if (!value) return '알 수 없음';
  if (value === 'default') return 'default (기본)';
  return value;
}

function findInitialSlug(items) {
  if (!Array.isArray(items)) return '';
  const target = items.find((item) => item?.slug);
  return target?.slug || '';
}

function deriveGridStats(bucket) {
  const cells = ensureArray(bucket?.cells);
  if (cells.length === 0) {
    return {
      grid: {
        cols: DEFAULT_GRID.cols,
        rows: DEFAULT_GRID.rows,
        counts: Array.from({ length: DEFAULT_GRID.rows }, () =>
          Array(DEFAULT_GRID.cols).fill(0)
        ),
      },
      totalCount: 0,
      maxCount: 0,
      averagePerCell: 0,
      sections: [],
      types: [],
      topCells: [],
      cellSummaries: [],
    };
  }

  const normalizedCells = cells
    .map((cell) => ({
      cell: Number(cell?.cell),
      count: Math.max(0, Number(cell?.count) || 0),
      section: typeof cell?.section === 'string' ? cell.section : 'root',
      type: typeof cell?.type === 'string' ? cell.type : 'generic',
    }))
    .filter((cell) => Number.isFinite(cell.cell) && cell.cell >= 0 && cell.count > 0);

  if (!normalizedCells.length) {
    return {
      grid: {
        cols: DEFAULT_GRID.cols,
        rows: DEFAULT_GRID.rows,
        counts: Array.from({ length: DEFAULT_GRID.rows }, () =>
          Array(DEFAULT_GRID.cols).fill(0)
        ),
      },
      totalCount: 0,
      maxCount: 0,
      averagePerCell: 0,
      sections: [],
      types: [],
      topCells: [],
      cellSummaries: [],
    };
  }

  const maxIndex = normalizedCells.reduce((max, cell) => Math.max(max, cell.cell), 0);
  const rowCount = Math.max(DEFAULT_GRID.rows, Math.floor(maxIndex / DEFAULT_GRID.cols) + 1);
  const gridCounts = Array.from({ length: rowCount }, () => Array(DEFAULT_GRID.cols).fill(0));
  const sectionMap = new Map();
  const typeMap = new Map();
  const details = [];
  const cellSummaryMap = new Map();

  let totalCount = 0;
  let maxCount = 0;

  normalizedCells.forEach((cell) => {
    const row = Math.floor(cell.cell / DEFAULT_GRID.cols);
    const col = cell.cell % DEFAULT_GRID.cols;
    if (row < 0 || row >= gridCounts.length || col < 0 || col >= DEFAULT_GRID.cols) {
      return;
    }
    gridCounts[row][col] += cell.count;
    totalCount += cell.count;
    if (gridCounts[row][col] > maxCount) {
      maxCount = gridCounts[row][col];
    }
    const sectionKey = cell.section || 'root';
    const typeKey = cell.type || 'generic';
    sectionMap.set(sectionKey, (sectionMap.get(sectionKey) || 0) + cell.count);
    typeMap.set(typeKey, (typeMap.get(typeKey) || 0) + cell.count);
    details.push({
      index: cell.cell,
      row,
      col,
      count: cell.count,
      section: sectionKey,
      type: typeKey,
    });

    const summaryKey = `${row}-${col}`;
    const summary = cellSummaryMap.get(summaryKey) || {
      row,
      col,
      count: 0,
      sections: new Map(),
      types: new Map(),
    };
    summary.count += cell.count;
    summary.sections.set(sectionKey, (summary.sections.get(sectionKey) || 0) + cell.count);
    summary.types.set(typeKey, (summary.types.get(typeKey) || 0) + cell.count);
    cellSummaryMap.set(summaryKey, summary);
  });

  const averagePerCell =
    gridCounts.length > 0 ? totalCount / (gridCounts.length * DEFAULT_GRID.cols) : 0;

  const sections = Array.from(sectionMap.entries())
    .map(([section, count]) => ({ section, count }))
    .sort((a, b) => b.count - a.count);

  const cellSummaries = Array.from(cellSummaryMap.values()).map((entry) => {
    const sections = Array.from(entry.sections.entries()).sort((a, b) => b[1] - a[1]);
    const typesList = Array.from(entry.types.entries()).sort((a, b) => b[1] - a[1]);
    return {
      row: entry.row,
      col: entry.col,
      count: entry.count,
      topSection: sections.length ? { id: sections[0][0], count: sections[0][1] } : null,
      topType: typesList.length ? { id: typesList[0][0], count: typesList[0][1] } : null,
    };
  });

  const types = Array.from(typeMap.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  const topCells = cellSummaries
    .slice()
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    grid: {
      cols: DEFAULT_GRID.cols,
      rows: gridCounts.length,
      counts: gridCounts,
    },
    totalCount,
    maxCount,
    averagePerCell,
    sections,
    types,
    topCells,
    cellSummaries,
    rawCells: details,
  };
}

export default function useHeatmapAnalytics({ enabled, token, items }) {
  const [selectedSlug, setSelectedSlug] = useState(() => findInitialSlug(items));
  const [selectedBucket, setSelectedBucket] = useState('');
  const [snapshot, setSnapshot] = useState({ slug: '', buckets: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    setSelectedSlug((prev) => {
      if (prev && items?.some?.((item) => item?.slug === prev)) {
        return prev;
      }
      return findInitialSlug(items);
    });
  }, [items]);

  const refresh = useCallback(() => {
    setVersion((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !selectedSlug) {
      return undefined;
    }

    const controller = new AbortController();

    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        params.set('slug', selectedSlug);
        if (token) params.set('token', token);
        const res = await fetch(`/api/admin/heatmap/snapshot?${params.toString()}`, {
          signal: controller.signal,
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json?.error || '히트맵 데이터를 불러오지 못했어요.');
        }
        const buckets = ensureArray(json?.buckets);
        setSnapshot({ slug: json?.slug || selectedSlug, buckets });

        setSelectedBucket((prev) => {
          if (prev && buckets.some((bucket) => bucket?.bucket === prev)) {
            return prev;
          }
          const defaultBucket = buckets.find((bucket) => bucket?.bucket === 'default');
          return defaultBucket?.bucket || (buckets[0]?.bucket || '');
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err?.message || '히트맵 데이터를 불러오지 못했어요.');
        setSnapshot({ slug: selectedSlug, buckets: [] });
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    run();
    return () => controller.abort();
  }, [enabled, selectedSlug, token, version]);

  const bucketOptions = useMemo(() => {
    return snapshot.buckets.map((bucket) => ({
      key: bucket?.bucket || 'unknown',
      label: formatBucketLabel(bucket?.bucket || 'unknown'),
    }));
  }, [snapshot.buckets]);

  const activeBucket = useMemo(() => {
    if (!selectedBucket) return snapshot.buckets[0] || null;
    return snapshot.buckets.find((bucket) => bucket?.bucket === selectedBucket) || null;
  }, [selectedBucket, snapshot.buckets]);

  const stats = useMemo(() => deriveGridStats(activeBucket), [activeBucket]);

  const exportCsv = useCallback(() => {
    if (!activeBucket) return;
    const rows = [['cell', 'row', 'col', 'count', 'section', 'type']];
    ensureArray(activeBucket?.cells)
      .map((cell) => ({
        index: Number(cell?.cell),
        row: Math.floor(Number(cell?.cell) / stats.grid.cols),
        col: Number(cell?.cell) % stats.grid.cols,
        count: Number(cell?.count) || 0,
        section: typeof cell?.section === 'string' ? cell.section : 'root',
        type: typeof cell?.type === 'string' ? cell.type : 'generic',
      }))
      .filter((cell) => Number.isFinite(cell.index) && cell.index >= 0 && Number.isFinite(cell.count))
      .sort((a, b) => b.count - a.count)
      .forEach((cell) => {
        rows.push([
          String(cell.index),
          String(cell.row),
          String(cell.col),
          String(cell.count),
          String(cell.section || 'root'),
          String(cell.type || 'generic'),
        ]);
      });
    const csv = rows.map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const bucketLabel = activeBucket?.bucket || 'bucket';
    link.href = url;
    link.setAttribute('download', `heatmap-${snapshot.slug || selectedSlug}-${bucketLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [activeBucket, selectedSlug, snapshot.slug, stats]);

  return {
    selectedSlug,
    setSelectedSlug,
    selectedBucket,
    setSelectedBucket,
    snapshot,
    bucketOptions,
    stats,
    loading,
    error,
    refresh,
    exportCsv,
  };
}

export { DEFAULT_GRID as HEATMAP_DEFAULT_GRID };
