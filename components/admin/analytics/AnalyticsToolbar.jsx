export default function AnalyticsToolbar({
  sortKey,
  sortDirection,
  onSortChange,
  visibleColumns,
  onToggleColumn,
  onExportCsv,
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
    <div className="flex flex-col gap-3 rounded-2xl bg-slate-900/70 p-4 ring-1 ring-slate-800/60 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-950/60 px-3 py-1 text-slate-400">정렬 기준</span>
          <button
            type="button"
            onClick={() => onSortChange('views')}
            className={`rounded-full px-3 py-1 font-semibold transition ${
              sortKey === 'views' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            조회수 {sortKey === 'views' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
          </button>
          <button
            type="button"
            onClick={() => onSortChange('likes')}
            className={`rounded-full px-3 py-1 font-semibold transition ${
              sortKey === 'likes' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            좋아요 {sortKey === 'likes' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full bg-slate-950/50 px-3 py-1">
            <span className="text-xs text-slate-500">검색</span>
            <input
              value={queryValue}
              onChange={handleQueryChange}
              placeholder="제목·슬러그"
              className="w-28 bg-transparent text-sm text-slate-200 outline-none sm:w-40"
            />
          </div>
          <div className="flex items-center gap-2 rounded-full bg-slate-950/50 px-3 py-1">
            <span className="text-xs text-slate-500">타입</span>
            <select
              value={typeValue}
              onChange={handleTypeChange}
              className="bg-transparent text-xs text-slate-200 outline-none"
            >
              <option value="">전체</option>
              <option value="video">영상</option>
              <option value="image">이미지</option>
            </select>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-slate-950/50 px-3 py-1">
            <span className="text-xs text-slate-500">방향</span>
            <select
              value={orientationValue}
              onChange={handleOrientationChange}
              className="bg-transparent text-xs text-slate-200 outline-none"
            >
              <option value="">전체</option>
              <option value="landscape">가로</option>
              <option value="portrait">세로</option>
              <option value="square">정사각형</option>
            </select>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
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
        <button
          type="button"
          onClick={onExportCsv}
          className="rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:brightness-110"
        >
          CSV 다운로드
        </button>
      </div>
    </div>
  );
}
