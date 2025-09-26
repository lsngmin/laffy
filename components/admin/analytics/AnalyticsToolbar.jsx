export default function AnalyticsToolbar({
  sort,
  sortOptions,
  onSortChange,
  onExport,
  visibleColumns,
  onToggleColumn,
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 justify-between rounded-2xl border border-slate-800/60 bg-slate-900/70 px-4 py-3 text-xs text-slate-200">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span className="uppercase tracking-widest text-slate-400">정렬</span>
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value)}
            className="rounded-lg bg-slate-800 px-2 py-1 text-xs text-slate-100"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center rounded-full bg-slate-800 px-3 py-1 font-semibold text-slate-100 transition hover:bg-slate-700"
        >
          CSV 내보내기
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {Object.entries(visibleColumns).map(([key, value]) => (
          <label key={key} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={value}
              onChange={(event) => onToggleColumn(key, event.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-emerald-400 focus:ring-emerald-500"
            />
            <span className="capitalize text-slate-300">{key}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
