import HeatmapSummaryCards from './HeatmapSummaryCards';
import HeatmapGrid from './HeatmapGrid';
import HeatmapZoneTable from './HeatmapZoneTable';
import HeatmapEventTable from './HeatmapEventTable';
import HeatmapBucketTable from './HeatmapBucketTable';

export default function HeatmapInsightsPanel({
  loading,
  error,
  slugs = [],
  selectedSlug,
  onSelectSlug,
  onRefresh,
  activeSlug,
  totals,
  generatedAt,
}) {
  const numberFormatter = new Intl.NumberFormat('ko-KR');
  const hasData = Boolean(activeSlug);

  return (
    <section className="space-y-6 rounded-3xl border border-emerald-500/20 bg-slate-950/70 p-6 shadow-xl shadow-black/30">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-emerald-200">광고 통합 인사이트 · 히트맵 분석</h2>
          <p className="mt-1 text-sm text-emerald-100/80">
            스폰서 노출과 CTA 영역의 실제 상호작용을 히트맵으로 집계해 광고 최적화 근거를 제공합니다.
          </p>
          <p className="mt-1 text-xs text-emerald-200/60">
            총 {numberFormatter.format(totals?.samples || 0)}회 샘플 · {numberFormatter.format(totals?.viewers || 0)}명 추정 뷰어 ·{' '}
            {numberFormatter.format(totals?.slugCount || 0)}개 슬러그 수집
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-emerald-100/80">
            <span>슬러그 선택</span>
            <select
              className="rounded-full border border-emerald-400/40 bg-slate-900/90 px-3 py-1 text-sm text-emerald-100 shadow-inner shadow-emerald-500/20 focus:border-emerald-300 focus:outline-none"
              value={selectedSlug || ''}
              onChange={(event) => onSelectSlug?.(event.target.value)}
              disabled={!slugs.length || loading}
            >
              {!slugs.length && <option value="">데이터 없음</option>}
              {slugs.map((entry) => (
                <option key={entry.slug} value={entry.slug}>
                  {entry.slug} · {numberFormatter.format(entry.totalSamples || 0)} 샘플
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => onRefresh?.()}
            disabled={loading}
            className="rounded-full border border-emerald-400/50 bg-emerald-500/10 px-4 py-1 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            새로고침
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => onRefresh?.()}
            className="mt-2 inline-flex rounded-full border border-red-400/40 px-3 py-1 text-xs font-semibold text-red-100 hover:bg-red-500/20"
          >
            다시 시도
          </button>
        </div>
      )}

      {loading && !error && (
        <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/60 p-6 text-sm text-emerald-100/80">
          히트맵 데이터를 불러오는 중이에요...
        </div>
      )}

      {!loading && !error && !hasData && (
        <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/70 p-6 text-sm text-emerald-100/80">
          아직 히트맵 데이터가 수집되지 않았어요. 스폰서 영역과 CTA에 히트맵 추적을 활성화하면 인사이트가 표시됩니다.
        </div>
      )}

      {hasData && (
        <div className="space-y-6">
          <HeatmapSummaryCards
            slug={activeSlug.slug}
            totalSamples={activeSlug.totalSamples}
            totalViewers={activeSlug.totalViewers}
            zoneSummary={activeSlug.zoneSummary}
            eventSummary={activeSlug.eventSummary}
            generatedAt={generatedAt}
          />

          <HeatmapGrid
            columns={activeSlug.cellSummary?.columns}
            rows={activeSlug.cellSummary?.rows}
            cells={activeSlug.cellSummary?.cells}
            maxTotal={activeSlug.cellSummary?.maxTotal}
            totals={activeSlug.cellSummary?.totals}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <HeatmapZoneTable zones={activeSlug.zoneSummary} />
            <HeatmapEventTable events={activeSlug.eventSummary} />
          </div>

          <HeatmapBucketTable buckets={activeSlug.bucketSummaries} />
        </div>
      )}
    </section>
  );
}
