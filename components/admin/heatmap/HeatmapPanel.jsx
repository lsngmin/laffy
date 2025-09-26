import { useCallback, useEffect, useMemo, useState } from 'react';
import HeatmapGrid from './HeatmapGrid';
import HeatmapBreakdown from './HeatmapBreakdown';

function formatDefaultPercent(value) {
  if (!Number.isFinite(value)) return '0%';
  return `${(value * 100).toFixed(1)}%`;
}

export default function HeatmapPanel({
  slug,
  onSlugChange,
  items,
  data,
  loading,
  error,
  onRefresh,
  formatNumber,
  formatPercent = formatDefaultPercent,
}) {
  const [activeBucket, setActiveBucket] = useState('');
  const slugOptions = useMemo(() => {
    if (!Array.isArray(items)) return [];
    return items
      .filter((item) => item?.slug)
      .map((item) => ({
        slug: item.slug,
        label: item.display?.socialTitle || item.display?.cardTitle || item.slug,
      }));
  }, [items]);

  const buckets = Array.isArray(data?.buckets) ? data.buckets : [];

  useEffect(() => {
    if (!buckets.length) {
      setActiveBucket('');
      return;
    }
    setActiveBucket((prev) => {
      if (prev && buckets.some((bucket) => bucket.bucket === prev)) {
        return prev;
      }
      return buckets[0].bucket;
    });
  }, [buckets]);

  const activeBucketData = useMemo(() => {
    if (!buckets.length) return null;
    return buckets.find((bucket) => bucket.bucket === activeBucket) || buckets[0];
  }, [activeBucket, buckets]);

  const totalSamples = activeBucketData?.totalCount || 0;
  const maxCellCount = activeBucketData?.maxCount || 0;
  const topSection = activeBucketData?.sections?.[0];
  const topCell = activeBucketData?.topCells?.[0];

  const handleBucketChange = useCallback((event) => {
    setActiveBucket(event.target.value);
  }, []);

  const handleSlugInput = useCallback(
    (event) => {
      onSlugChange(event.target.value);
    },
    [onSlugChange]
  );

  const handleExport = useCallback(() => {
    if (!activeBucketData || typeof window === 'undefined') return;
    const rows = [
      ['bucket', 'row', 'column', 'cell', 'section', 'type', 'count', 'ratio'],
    ];
    activeBucketData.cells.forEach((cell) => {
      rows.push([
        activeBucketData.bucket,
        cell.rowLabel,
        cell.columnLabel,
        cell.cell,
        cell.section,
        cell.type,
        cell.count,
        Number.isFinite(cell.ratio) ? cell.ratio : 0,
      ]);
    });
    const csv = rows
      .map((row) =>
        row
          .map((value) => {
            if (value === null || value === undefined) return '';
            const stringValue = typeof value === 'number' ? value.toString() : String(value);
            if (/[",\n]/.test(stringValue)) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          })
          .join(',')
      )
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `heatmap-${slug || 'content'}-${activeBucketData.bucket}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [activeBucketData, slug]);

  const isEmpty = !loading && !error && (!activeBucketData || activeBucketData.totalCount === 0);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-indigo-500/40 bg-slate-950/80 p-6 shadow-inner shadow-indigo-500/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">분석</h2>
            <p className="mt-1 text-sm text-slate-400">
              콘텐츠 상세 페이지에서 수집한 좌표 기반 이벤트를 시각화하고, 섹션/이벤트 유형별 분포를 분석할 수 있어요.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-indigo-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? '불러오는 중…' : '새로고침'}
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={!activeBucketData || activeBucketData.totalCount === 0}
              className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-300 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              CSV 내보내기
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div>
            <label htmlFor="heatmap-slug-input" className="text-xs uppercase tracking-[0.3em] text-slate-400">
              콘텐츠 슬러그
            </label>
            <input
              id="heatmap-slug-input"
              type="text"
              list="heatmap-slug-options"
              value={slug}
              onChange={handleSlugInput}
              placeholder="예: funny-cat-video"
              className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-2 text-sm text-white placeholder-slate-600 focus:border-indigo-400 focus:outline-none"
            />
            <datalist id="heatmap-slug-options">
              {slugOptions.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.label}
                </option>
              ))}
            </datalist>
            <p className="mt-2 text-xs text-slate-500">
              업로드 목록과 연동된 슬러그를 자동 완성으로 선택하거나 직접 입력할 수 있어요.
            </p>
          </div>

          <div>
            <label htmlFor="heatmap-bucket-select" className="text-xs uppercase tracking-[0.3em] text-slate-400">
              뷰포트 버킷
            </label>
            <select
              id="heatmap-bucket-select"
              value={activeBucket}
              onChange={handleBucketChange}
              className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
              disabled={!buckets.length}
            >
              {!buckets.length && <option value="">데이터 없음</option>}
              {buckets.map((bucket) => (
                <option key={bucket.bucket} value={bucket.bucket}>
                  {bucket.bucket}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">
              해상도·기기 조합별로 자동 생성되는 버킷 단위로 데이터를 전환할 수 있어요.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      {!error && slug && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">총 샘플 수</p>
              <p className="mt-2 text-3xl font-bold text-white">{formatNumber(totalSamples)}</p>
              <p className="mt-1 text-xs text-slate-500">선택된 버킷에 누적된 히트맵 이벤트 합계</p>
            </div>
            <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">최대 셀 강도</p>
              <p className="mt-2 text-3xl font-bold text-white">{formatNumber(maxCellCount)}</p>
              <p className="mt-1 text-xs text-slate-500">가장 많이 기록된 셀의 샘플 수</p>
            </div>
            <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">주요 섹션</p>
              <p className="mt-2 text-xl font-bold text-emerald-200">{topSection ? topSection.section : '데이터 없음'}</p>
              <p className="mt-1 text-xs text-slate-500">
                기여도 {topSection ? formatPercent(topSection.ratio || 0) : '0%'}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">핫스팟 셀</p>
              <p className="mt-2 text-xl font-bold text-sky-200">
                {topCell ? `행 ${topCell.rowLabel}, 열 ${topCell.columnLabel}` : '데이터 없음'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                샘플 {topCell ? formatNumber(topCell.count || 0) : '0'} · 비율{' '}
                {topCell ? formatPercent(topCell.ratio || 0) : '0%'}
              </p>
            </div>
          </div>

          {loading && (
            <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-8 text-center text-sm text-slate-400">
              히트맵 데이터를 불러오는 중이에요…
            </div>
          )}

          {!loading && isEmpty && (
            <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-8 text-center text-sm text-slate-400">
              아직 선택한 조건에 대한 히트맵 샘플이 없습니다.
            </div>
          )}

          {!loading && !isEmpty && activeBucketData && (
            <div className="space-y-6">
              <div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-semibold text-white">히트맵 시각화</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>낮음</span>
                    <div className="h-2 w-40 rounded-full bg-gradient-to-r from-indigo-500/50 via-sky-400 to-rose-500"></div>
                    <span>높음</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  좌표는 12×8 그리드로 정규화되어 있으며, 셀 색상이 짙을수록 이벤트가 많이 기록된 지점을 의미합니다.
                </p>
              </div>

              <HeatmapGrid
                grid={activeBucketData.grid}
                cells={activeBucketData.cells}
                maxCount={activeBucketData.maxCount}
                formatNumber={formatNumber}
              />

              <HeatmapBreakdown
                bucket={activeBucketData}
                formatNumber={formatNumber}
                formatPercent={formatPercent}
              />
            </div>
          )}
        </div>
      )}

      {!slug && !error && (
        <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-8 text-center text-sm text-slate-400">
          분석할 콘텐츠 슬러그를 먼저 선택해 주세요.
        </div>
      )}
    </div>
  );
}
