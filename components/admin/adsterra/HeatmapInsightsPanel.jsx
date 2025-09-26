import { Fragment, useMemo } from 'react';

function formatShare(formatPercent, value) {
  if (!Number.isFinite(value) || value <= 0) return '0%';
  return formatPercent(value);
}

function BucketHighlights({ bucket, formatNumber, formatPercent }) {
  const { bucket: bucketName, samples, viewerCount, totalInteractions, pointerRate, clickRate, scrollRate } = bucket;

  return (
    <div className="space-y-3 rounded-xl border border-slate-800/70 bg-slate-900/70 p-4">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="rounded-full bg-slate-950/60 px-2 py-1 font-semibold uppercase tracking-widest text-slate-300">
          {bucketName}
        </span>
        <span className="text-slate-500">샘플 {formatNumber(samples)} · 이용자 {formatNumber(viewerCount)}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg bg-slate-950/40 p-3 text-xs text-slate-300">
          <p className="font-semibold text-slate-100">상호작용</p>
          <p className="mt-1 text-lg font-bold text-white">{formatNumber(totalInteractions)}</p>
          <p className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-400">
            <span className="rounded-full bg-slate-900/60 px-2 py-1">포인터 {formatShare(formatPercent, pointerRate)}</span>
            <span className="rounded-full bg-slate-900/60 px-2 py-1">클릭 {formatShare(formatPercent, clickRate)}</span>
            <span className="rounded-full bg-slate-900/60 px-2 py-1">스크롤 {formatShare(formatPercent, scrollRate)}</span>
          </p>
        </div>
        <div className="rounded-lg bg-slate-950/40 p-3 text-xs text-slate-300">
          <p className="font-semibold text-slate-100">상위 존</p>
          <ul className="mt-2 space-y-1">
            {bucket.zones.length === 0 && <li className="text-slate-500">집계된 존이 없습니다.</li>}
            {bucket.zones.map((zone) => (
              <li key={`${zone.zone}:${zone.type}`} className="flex items-center justify-between gap-3">
                <span className="truncate text-slate-200">
                  {zone.zone}
                  <span className="ml-1 text-[10px] uppercase text-indigo-300/80">{zone.type}</span>
                </span>
                <span className="text-[11px] text-slate-400">{formatShare(formatPercent, zone.share)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg bg-slate-950/40 p-3 text-xs text-slate-300">
          <p className="font-semibold text-slate-100">상위 이벤트</p>
          <ul className="mt-2 space-y-1">
            {bucket.events.length === 0 && <li className="text-slate-500">집계된 이벤트가 없습니다.</li>}
            {bucket.events.map((event) => (
              <li key={event.type} className="flex items-center justify-between gap-3">
                <span className="truncate text-slate-200">{event.type}</span>
                <span className="text-[11px] text-slate-400">{formatShare(formatPercent, event.share)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {bucket.cells.length > 0 && (
        <div className="rounded-lg bg-slate-950/40 p-3 text-xs text-slate-300">
          <p className="font-semibold text-slate-100">히트맵 셀 분포 (상위 {bucket.cells.length}개)</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {bucket.cells.map((cell) => (
              <div key={cell.cell} className="rounded-md bg-slate-900/60 p-2">
                <p className="text-slate-200">셀 #{cell.cell}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  행 {cell.row + 1}, 열 {cell.column + 1} · 비중 {formatShare(formatPercent, cell.share)}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">상호작용 {formatNumber(cell.total)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HeatmapInsightsPanel({
  insights,
  loading,
  error,
  slugFilter,
  setSlugFilter,
  refresh,
  formatNumber,
  formatPercent,
}) {
  const availableSlugs = useMemo(() => {
    if (!insights?.availableSlugs) return [];
    return Array.isArray(insights.availableSlugs) ? insights.availableSlugs : [];
  }, [insights]);

  const entries = Array.isArray(insights?.slugs) ? insights.slugs : [];
  const generatedAt = insights?.generatedAt || '';

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">히트맵 분석</h3>
          <p className="text-sm text-slate-400">
            광고 배치 주변의 집중 구간과 인터랙션을 히트맵 데이터로 확인합니다.
            {generatedAt && (
              <span className="ml-2 text-xs text-slate-500">업데이트 {new Date(generatedAt).toLocaleString('ko-KR')}</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
          <label className="flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/60 px-3 py-2">
            <span className="text-slate-400">슬러그</span>
            <select
              className="bg-transparent text-slate-100 focus:outline-none"
              value={slugFilter || ''}
              onChange={(event) => setSlugFilter?.(event.target.value)}
            >
              <option value="">전체</option>
              {availableSlugs.map((slug) => (
                <option key={slug} value={slug}>
                  {slug}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => refresh?.()}
            className="rounded-full bg-indigo-500/80 px-4 py-2 font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500"
            disabled={loading}
          >
            새로고침
          </button>
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-6 text-sm text-slate-400">
          히트맵 데이터를 불러오는 중이에요…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-700/40 bg-rose-900/40 p-6 text-sm text-rose-100">
          {error}
          <button
            type="button"
            onClick={() => refresh?.()}
            className="ml-3 rounded-full border border-rose-200/60 px-3 py-1 text-xs text-rose-100 hover:bg-rose-200/10"
          >
            다시 시도
          </button>
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-6 text-sm text-slate-400">
          아직 집계된 히트맵 데이터가 없습니다.
        </div>
      )}

      {entries.length > 0 && (
        <div className="space-y-6">
          {entries.map((entry) => (
            <Fragment key={entry.slug}>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-base font-semibold text-white">{entry.slug}</h4>
                    <p className="text-xs text-slate-400">
                      총 샘플 {formatNumber(entry.totalSamples)} · 이용자 {formatNumber(entry.totalViewerCount)} · 상호작용 {formatNumber(entry.totalInteractions)}
                    </p>
                  </div>
                  {(entry.topZones?.length || entry.topEvents?.length) && (
                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
                      {entry.topZones?.slice(0, 2).map((zone) => (
                        <span key={`${zone.zone}:${zone.type}`} className="rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-100">
                          {zone.zone} {formatShare(formatPercent, zone.share)}
                        </span>
                      ))}
                      {entry.topEvents?.slice(0, 2).map((event) => (
                        <span key={event.type} className="rounded-full bg-cyan-500/20 px-3 py-1 text-cyan-100">
                          {event.type} {formatShare(formatPercent, event.share)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {entry.buckets.map((bucket) => (
                    <BucketHighlights
                      key={`${entry.slug}:${bucket.bucket}`}
                      bucket={bucket}
                      formatNumber={formatNumber}
                      formatPercent={formatPercent}
                    />
                  ))}
                </div>
              </div>
            </Fragment>
          ))}
        </div>
      )}
    </section>
  );
}
