const SORT_OPTIONS = [
  { value: 'recent', label: '최신순' },
  { value: 'title', label: '제목순' },
];

export default function UploadFilters({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  sortOption,
  onSortOptionChange,
}) {
  return (
    <div className="space-y-4 rounded-3xl border border-slate-800/60 bg-[#050916]/80 p-5 shadow-inner shadow-slate-900/40">
      <div className="flex items-center justify-between rounded-2xl border border-slate-900/70 bg-slate-950/40 px-4 py-3 text-[12px] text-slate-300">
        <span className="font-semibold uppercase tracking-[0.32em] text-slate-400">채널</span>
        <span className="rounded-full border border-sky-400/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">
          L 전용 라우트
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(200px,1fr)_minmax(140px,200px)_minmax(140px,200px)]">
        <label className="group flex items-center gap-2 rounded-2xl border border-slate-900/60 bg-slate-950/40 px-3 py-2 text-sm text-slate-300 transition hover:border-sky-500/40">
          <span className="text-xs uppercase tracking-[0.3em] text-slate-500">검색</span>
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="제목·슬러그"
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
          />
        </label>
        <label className="group flex items-center justify-between gap-2 rounded-2xl border border-slate-900/60 bg-slate-950/40 px-3 py-2 text-xs uppercase tracking-[0.3em] text-slate-500 transition hover:border-sky-500/40">
          <span>타입</span>
          <select
            value={typeFilter}
            onChange={(event) => onTypeFilterChange(event.target.value)}
            className="rounded-lg border border-slate-800/50 bg-black/50 px-2 py-1 text-[11px] text-slate-100 outline-none"
          >
            <option value="">전체</option>
            <option value="video">영상</option>
            <option value="image">이미지</option>
          </select>
        </label>
        <label className="group flex items-center justify-between gap-2 rounded-2xl border border-slate-900/60 bg-slate-950/40 px-3 py-2 text-xs uppercase tracking-[0.3em] text-slate-500 transition hover:border-sky-500/40">
          <span>정렬</span>
          <select
            value={sortOption}
            onChange={(event) => onSortOptionChange(event.target.value)}
            className="rounded-lg border border-slate-800/50 bg-black/50 px-2 py-1 text-[11px] text-slate-100 outline-none"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
