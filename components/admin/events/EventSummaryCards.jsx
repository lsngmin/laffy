function aggregateByEvent(items) {
  const map = new Map();
  if (!Array.isArray(items)) return map;
  items.forEach((item) => {
    const name = typeof item?.eventName === 'string' ? item.eventName : '';
    if (!name) return;
    const prev = map.get(name) || { count: 0, uniqueSessions: 0 };
    const count = Number(item?.count) || 0;
    const uniqueSessions = Number(item?.uniqueSessions) || 0;
    map.set(name, {
      count: prev.count + count,
      uniqueSessions: prev.uniqueSessions + uniqueSessions,
    });
  });
  return map;
}

function formatPercentDefault(value) {
  return `${(Math.max(0, Math.min(1, value || 0)) * 100).toFixed(1)}%`;
}

export default function EventSummaryCards({ totals, items = [], formatNumber, formatPercent = formatPercentDefault }) {
  const stats = aggregateByEvent(items);
  const visits = stats.get('x_visit') || { count: Number(totals?.count) || 0, uniqueSessions: Number(totals?.uniqueSessions) || 0 };
  const anyClick = stats.get('x_any_click') || { count: 0 };

  const visitorCount = Number(visits.uniqueSessions) || 0;
  const pageViews = Number(visits.count) || 0;
  const bounceRate = pageViews > 0 ? Math.max(0, Math.min(1, 1 - anyClick.count / pageViews)) : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="rounded-2xl border border-slate-800/70 bg-slate-900/80 p-4 shadow-inner shadow-black/40">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">방문자</p>
        <p className="mt-2 text-3xl font-bold text-white">{formatNumber(visitorCount)}</p>
        <p className="mt-1 text-xs text-slate-500">고유 세션 수 = uniqueSessions(x_visit)</p>
      </div>
      <div className="rounded-2xl border border-slate-800/70 bg-slate-900/80 p-4 shadow-inner shadow-black/40">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">페이지 뷰</p>
        <p className="mt-2 text-3xl font-bold text-white">{formatNumber(pageViews)}</p>
        <p className="mt-1 text-xs text-slate-500">페이지 뷰 = Σ count(x_visit)</p>
      </div>
      <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-4 shadow-lg shadow-emerald-500/20">
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">이탈률</p>
        <p className="mt-2 text-3xl font-bold text-emerald-100">{formatPercent(bounceRate)}</p>
        <p className="mt-1 text-xs text-emerald-200/80">이탈률 = 1 - (count(x_any_click) ÷ count(x_visit))</p>
      </div>
    </div>
  );
}
