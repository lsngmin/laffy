export default function HeatmapToolbar({
  slugOptions,
  selectedSlug,
  onSlugChange,
  bucketOptions,
  selectedBucket,
  onBucketChange,
  onRefresh,
  onExport,
  loading,
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-slate-900/80 p-4 shadow-inner shadow-slate-900/40 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex flex-col text-xs text-slate-400 sm:flex-row sm:items-center sm:gap-2">
          <span className="uppercase tracking-[0.2em]">콘텐츠</span>
          <select
            value={selectedSlug}
            onChange={(event) => onSlugChange?.(event.target.value)}
            className="mt-1 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none transition hover:border-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50 sm:mt-0"
          >
            {slugOptions.length === 0 && <option value="">선택 가능한 슬러그가 없어요</option>}
            {slugOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-xs text-slate-400 sm:flex-row sm:items-center sm:gap-2">
          <span className="uppercase tracking-[0.2em]">뷰포트 버킷</span>
          <select
            value={selectedBucket}
            onChange={(event) => onBucketChange?.(event.target.value)}
            className="mt-1 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none transition hover:border-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50 sm:mt-0"
          >
            {bucketOptions.length === 0 && <option value="">데이터 없음</option>}
            {bucketOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-indigo-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? '불러오는 중…' : '새로고침'}
        </button>
        <button
          type="button"
          onClick={onExport}
          disabled={loading || !selectedBucket}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          CSV 내보내기
        </button>
      </div>
    </div>
  );
}
