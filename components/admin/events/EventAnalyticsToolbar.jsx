import { useMemo } from 'react';

export default function EventAnalyticsToolbar({
  startDate,
  endDate,
  onDateChange,
  eventNames,
  selectedEvent,
  onSelectEvent,
  slugFilter,
  onSlugChange,
  onRefresh,
  onDownloadCsv,
  loading,
}) {
  const options = useMemo(() => {
    const items = Array.isArray(eventNames) ? eventNames : [];
    return [''].concat(items.filter((name) => typeof name === 'string' && name));
  }, [eventNames]);

  const handleStartChange = (event) => {
    onDateChange?.({ start: event.target.value, end: endDate });
  };

  const handleEndChange = (event) => {
    onDateChange?.({ start: startDate, end: event.target.value });
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-slate-900/70 p-4 ring-1 ring-slate-800/60">
      <div className="flex flex-col gap-3 text-xs text-slate-200 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex flex-col text-[11px] uppercase tracking-[0.25em] text-slate-400">
            시작일
            <input
              type="date"
              value={startDate || ''}
              onChange={handleStartChange}
              className="mt-1 rounded-md border border-slate-700/60 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <label className="flex flex-col text-[11px] uppercase tracking-[0.25em] text-slate-400">
            종료일
            <input
              type="date"
              value={endDate || ''}
              onChange={handleEndChange}
              className="mt-1 rounded-md border border-slate-700/60 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-full bg-slate-950/50 px-3 py-1 text-xs text-slate-200">
            <span className="text-slate-400">이벤트</span>
            <select
              value={selectedEvent || ''}
              onChange={(event) => onSelectEvent?.(event.target.value)}
              className="rounded-md border border-slate-700/60 bg-slate-950 px-2 py-1 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none"
            >
              {options.map((name) => (
                <option key={name || 'all'} value={name}>
                  {name ? name : '전체 이벤트'}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 rounded-full bg-slate-950/50 px-3 py-1 text-xs text-slate-200">
            <span className="text-slate-400">슬러그</span>
            <input
              type="text"
              value={slugFilter || ''}
              onChange={(event) => onSlugChange?.(event.target.value)}
              placeholder="예: funny-meme"
              className="rounded-md border border-slate-700/60 bg-slate-950 px-2 py-1 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-full border border-slate-700/60 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-800"
          >
            새로고침
          </button>
          <button
            type="button"
            onClick={onDownloadCsv}
            className="rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:brightness-110"
          >
            CSV 다운로드
          </button>
        </div>
      </div>
      {loading && (
        <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 px-3 py-2 text-xs text-slate-400">
          이벤트 데이터를 불러오는 중입니다…
        </div>
      )}
    </div>
  );
}
