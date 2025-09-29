const SORT_OPTIONS = [
  { value: 'recent', label: '최신순' },
  { value: 'title', label: '제목순' },
  { value: 'duration', label: '재생시간' },
];

const CHANNEL_TABS = [
  { value: '', label: '전체' },
  { value: 'l', label: 'L 채널' },
  { value: 'x', label: 'X 채널' },
  { value: 'k', label: 'K 채널' },
];

export default function UploadFilters({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  channelFilter,
  onChannelFilterChange,
  sortOption,
  onSortOptionChange,
}) {
  return (
    <div className="space-y-4 rounded-3xl border border-slate-800/60 bg-[#050916]/80 p-5 shadow-inner shadow-slate-900/40">
      <div className="flex flex-wrap items-center gap-2 rounded-full bg-slate-950/40 p-1">
        {CHANNEL_TABS.map((tab) => {
          const isActive = channelFilter === tab.value;
          return (
            <button
              key={tab.value || 'all'}
              type="button"
              onClick={() => onChannelFilterChange(tab.value)}
              className={`flex-1 min-w-[96px] rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] transition ${
                isActive
                  ? 'bg-gradient-to-r from-sky-500/80 via-cyan-400/80 to-indigo-500/80 text-slate-950 shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
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
