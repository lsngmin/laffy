import { useMemo } from 'react';
import HeatmapToolbar from './HeatmapToolbar';
import HeatmapSummary from './HeatmapSummary';
import HeatmapGridView from './HeatmapGridView';
import HeatmapBreakdown from './HeatmapBreakdown';

export default function HeatmapPanel({ items, heatmap, formatNumber, formatDecimal }) {
  const slugOptions = useMemo(() => {
    if (!Array.isArray(items)) return [];
    return items
      .filter((item) => item?.slug)
      .map((item) => ({
        value: item.slug,
        label: `${item.display?.cardTitle || item.title || item.slug} (${item.slug})`,
      }));
  }, [items]);

  return (
    <div className="space-y-6">
      <HeatmapToolbar
        slugOptions={slugOptions}
        selectedSlug={heatmap.selectedSlug || ''}
        onSlugChange={heatmap.setSelectedSlug}
        bucketOptions={heatmap.bucketOptions}
        selectedBucket={heatmap.selectedBucket || ''}
        onBucketChange={heatmap.setSelectedBucket}
        onRefresh={heatmap.refresh}
        onExport={heatmap.exportCsv}
        loading={heatmap.loading}
      />

      <HeatmapSummary stats={heatmap.stats} formatNumber={formatNumber} formatDecimal={formatDecimal} />

      <HeatmapGridView
        grid={heatmap.stats.grid}
        maxCount={heatmap.stats.maxCount}
        loading={heatmap.loading}
        error={heatmap.error}
        cellSummaries={heatmap.stats.cellSummaries}
      />

      <HeatmapBreakdown stats={heatmap.stats} />
    </div>
  );
}
