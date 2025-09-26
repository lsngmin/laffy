export default function EventSummaryCards({ totals, formatNumber, formatPercent }) {
  const totalCount = Number(totals?.count) || 0;
  const visitors = Number(totals?.visitors ?? totals?.uniqueSessions) || 0;
  const pageViews = Number(totals?.pageViews ?? totalCount) || 0;
  const bounceRateRaw = Number(totals?.bounceRate) || 0;
  const bounceRate = bounceRateRaw > 0 ? Math.min(1, bounceRateRaw) : 0;
  const pageViewEvents = Array.isArray(totals?.pageViewEventNames) ? totals.pageViewEventNames : [];
  const visitorEvents = Array.isArray(totals?.visitorEventNames) ? totals.visitorEventNames : [];
  const bounceEvents = Array.isArray(totals?.bounceEventNames) ? totals.bounceEventNames : [];

  const formatEventList = (events, fallback) => {
    if (!events.length) return fallback;
    return events.slice(0, 3).join(', ');
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="rounded-2xl border border-slate-800/70 bg-slate-900/80 p-4 shadow-inner shadow-black/40">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">방문자</p>
        <p className="mt-2 text-3xl font-bold text-white">{formatNumber(visitors)}</p>
        <p className="mt-1 text-xs text-slate-500">
          {formatEventList(visitorEvents, '전체 이벤트')} 고유 세션 수 기반
        </p>
      </div>
      <div className="rounded-2xl border border-slate-800/70 bg-slate-900/80 p-4 shadow-inner shadow-black/40">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">페이지 뷰</p>
        <p className="mt-2 text-3xl font-bold text-white">{formatNumber(pageViews)}</p>
        <p className="mt-1 text-xs text-slate-500">
          {formatEventList(pageViewEvents, '전체 이벤트')} 이벤트 누적 합계
        </p>
      </div>
      <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-4 shadow-lg shadow-emerald-500/20">
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">이탈률</p>
        <p className="mt-2 text-3xl font-bold text-emerald-100">{formatPercent(bounceRate)}</p>
        <p className="mt-1 text-xs text-emerald-200/80">
          {formatEventList(bounceEvents, '이탈 이벤트')} ÷ {formatEventList(visitorEvents, '방문 이벤트')}
        </p>
      </div>
    </div>
  );
}
