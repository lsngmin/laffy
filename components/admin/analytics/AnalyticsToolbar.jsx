export default function AnalyticsToolbar({
  sortKey,
  sortDirection,
  onSortChange,
  visibleColumns,
  onToggleColumn,
  onExportCsv,
  startDate,
  endDate,
  onDateChange,
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-slate-900/70 p-4 ring-1 ring-slate-800/60 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-xs">
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
      <div className="flex flex-col gap-3 text-xs text-slate-300 md:flex-row md:items-center md:justify-end">
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
        <div className="flex flex-wrap items-center gap-2 text-slate-200">
          <label className="flex items-center gap-1 rounded-full bg-slate-950/60 px-3 py-1">
            <span className="text-[11px] uppercase tracking-widest text-slate-400">시작</span>
            <input
              type="date"
              value={startDate || ''}
              onChange={(event) => onDateChange?.('start', event.target.value)}
              className="rounded bg-slate-800/80 px-2 py-1 text-xs text-slate-100 outline-none"
            />
          </label>
          <label className="flex items-center gap-1 rounded-full bg-slate-950/60 px-3 py-1">
            <span className="text-[11px] uppercase tracking-widest text-slate-400">종료</span>
            <input
              type="date"
              value={endDate || ''}
              onChange={(event) => onDateChange?.('end', event.target.value)}
              className="rounded bg-slate-800/80 px-2 py-1 text-xs text-slate-100 outline-none"
            />
          </label>
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
