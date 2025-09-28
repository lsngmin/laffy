/**
 * NOTE: This component is archived and not currently used in the admin UI.
 */
export default function AnalyticsToolbar({
  sortKey,
  sortDirection,
  onSortChange,
  visibleColumns,
  onToggleColumn,
  onExportCsv,
  selectedCount,
  onOpenBulkEditor,
  onOpenHistory,
  onOpenCsvUpload,
  startDate,
  endDate,
  onDateChange,
  filters,
  onFilterChange,

}) {
  const resolvedFilters = filters || {};
  const typeValue = resolvedFilters.type || '';
  const orientationValue = resolvedFilters.orientation || '';
  const queryValue = resolvedFilters.query || '';

  const handleQueryChange = (event) => {
    onFilterChange?.({ query: event.target.value });
  };

  const handleTypeChange = (event) => {
    onFilterChange?.({ type: event.target.value });
  };

  const handleOrientationChange = (event) => {
    onFilterChange?.({ orientation: event.target.value });
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-slate-900/70 p-4 ring-1 ring-slate-800/60">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 overflow-x-auto text-xs [scrollbar-width:thin] [-ms-overflow-style:none] lg:overflow-visible">
          <span className="whitespace-nowrap rounded-full bg-slate-950/60 px-3 py-1 text-slate-400">정렬 기준</span>
          <div className="flex min-w-0 flex-nowrap gap-2">
            <button
              type="button"
              onClick={() => onSortChange('views')}
              className={`whitespace-nowrap rounded-full px-3 py-1 font-semibold transition ${
                sortKey === 'views' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              조회수 {sortKey === 'views' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
            </button>
            <button
              type="button"
              onClick={() => onSortChange('likes')}
              className={`whitespace-nowrap rounded-full px-3 py-1 font-semibold transition ${
                sortKey === 'likes' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              좋아요 {sortKey === 'likes' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 lg:justify-end">
          <span className="rounded-full bg-slate-950/60 px-3 py-1 text-slate-400">선택 {selectedCount}개</span>
          <button
            type="button"
            onClick={onOpenBulkEditor}
            disabled={!selectedCount}
            className="rounded-full border border-slate-700/60 px-4 py-2 font-semibold text-slate-200 transition enabled:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            선택 항목 편집
          </button>
          <button
            type="button"
            onClick={onOpenHistory}
            className="rounded-full border border-slate-700/60 px-4 py-2 font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            변경 이력
          </button>
          <button
            type="button"
            onClick={onOpenCsvUpload}
            className="rounded-full border border-indigo-500/60 px-4 py-2 font-semibold text-indigo-200 transition hover:bg-indigo-500/20"
          >
            CSV 업로드
          </button>
          <button
            type="button"
            onClick={onExportCsv}
            className="rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 px-4 py-2 font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:brightness-110"
          >
            CSV 다운로드
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-3 text-xs text-slate-300 md:flex-row md:items-center md:justify-between">

        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(visibleColumns).map(([key, value]) => (
            <label
              key={key}
              className="flex items-center gap-1 rounded-full bg-slate-950/50 px-3 py-1 capitalize"
            >
              <input
                type="checkbox"
                checked={value}
                onChange={() => onToggleColumn(key)}
                className="accent-indigo-400"
              />
              {key}
            </label>
          ))}
        </div>

      </div>
    </div>
  );
}
