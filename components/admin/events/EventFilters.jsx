export default function EventFilters({
  startDate,
  endDate,
  onDateChange,
  filters,
  onFilterChange,
  catalog,
  loading,
  onRefresh,
  granularity = 'day',
  onGranularityChange,
}) {
  const events = Array.isArray(catalog?.events) ? catalog.events : [];
  const slugsByEvent = catalog?.slugsByEvent && typeof catalog.slugsByEvent === 'object' ? catalog.slugsByEvent : {};
  const eventValue = filters?.eventName || '';
  const slugOptions = Array.isArray(slugsByEvent[eventValue]) ? slugsByEvent[eventValue] : [];
  const slugValue = filters?.slug || '';
  const granularityValue = typeof granularity === 'string' && granularity ? granularity : 'day';

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-slate-900/70 p-4 ring-1 ring-slate-800/60">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          <span className="font-semibold uppercase tracking-[0.3em] text-slate-400">시작일</span>
          <input
            type="date"
            value={startDate || ''}
            onChange={(event) => onDateChange?.('start', event.target.value)}
            className="rounded-lg border border-slate-700/60 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          <span className="font-semibold uppercase tracking-[0.3em] text-slate-400">종료일</span>
          <input
            type="date"
            value={endDate || ''}
            onChange={(event) => onDateChange?.('end', event.target.value)}
            className="rounded-lg border border-slate-700/60 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          <span className="font-semibold uppercase tracking-[0.3em] text-slate-400">이벤트명</span>
          <select
            value={eventValue}
            onChange={(event) => onFilterChange?.({ eventName: event.target.value, slug: '' })}
            className="rounded-lg border border-slate-700/60 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
          >
            <option value="">전체</option>
            {events.map((eventName) => (
              <option key={eventName} value={eventName}>
                {eventName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          <span className="font-semibold uppercase tracking-[0.3em] text-slate-400">슬러그</span>
          <select
            value={slugValue}
            onChange={(event) => onFilterChange?.({ slug: event.target.value })}
            className="rounded-lg border border-slate-700/60 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
            disabled={!eventValue}
          >
            <option value="">전체</option>
            {slugOptions.map((slug) => (
              <option key={slug} value={slug}>
                {slug}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          <span className="font-semibold uppercase tracking-[0.3em] text-slate-400">시간 단위</span>
          <select
            value={granularityValue}
            onChange={(event) => onGranularityChange?.(event.target.value)}
            className="rounded-lg border border-slate-700/60 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
            disabled={loading}
          >
            <option value="10m">10분</option>
            <option value="day">일별</option>
            <option value="week">주별</option>
            <option value="month">월별</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-950/60 px-3 py-1 text-slate-400">
            {eventValue ? `${eventValue}${slugValue ? ` · ${slugValue}` : ''}` : '전체 이벤트'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onRefresh?.()}
          disabled={loading}
          className="rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-500/30 transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? '갱신 중…' : '데이터 새로고침'}
        </button>
      </div>
    </div>
  );
}
