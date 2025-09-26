import clsx from 'clsx';

function formatEventList(events = [], fallback) {
  if (!Array.isArray(events) || events.length === 0) {
    return fallback;
  }
  if (events.length === 1) return events[0];
  const displayed = events.slice(0, 2);
  const remaining = events.length - displayed.length;
  return remaining > 0 ? `${displayed.join(', ')} 외 ${remaining}건` : displayed.join(', ');
}

const CARD_CONFIG = [
  {
    key: 'revenuePerVisitor',
    title: '방문자당 수익',
    accent: 'from-emerald-500/20 via-teal-400/15 to-transparent',
    border: 'border-emerald-400/40',
  },
  {
    key: 'eventsPerClick',
    title: '클릭 대비 이벤트',
    accent: 'from-sky-500/20 via-indigo-400/15 to-transparent',
    border: 'border-sky-400/40',
  },
  {
    key: 'pageviewToImpression',
    title: '페이지 뷰·노출 비율',
    accent: 'from-fuchsia-500/20 via-rose-400/15 to-transparent',
    border: 'border-fuchsia-400/40',
  },
];

export default function IntegratedInsightHighlights({
  eventTotals,
  adTotals,
  formatNumber,
  formatDecimal,
  formatPercent,
}) {
  const visitors = Number(eventTotals?.visitors ?? eventTotals?.uniqueSessions ?? 0) || 0;
  const pageViews = Number(eventTotals?.pageViews ?? eventTotals?.count ?? 0) || 0;
  const totalEvents = Number(eventTotals?.count ?? 0) || 0;
  const revenue = Number(adTotals?.revenue ?? 0) || 0;
  const clicks = Number(adTotals?.clicks ?? 0) || 0;
  const impressions = Number(adTotals?.impressions ?? 0) || 0;

  const visitorEvents = eventTotals?.visitorEventNames || [];
  const pageViewEvents = eventTotals?.pageViewEventNames || [];

  const derived = {
    revenuePerVisitor: visitors > 0 ? revenue / visitors : 0,
    eventsPerClick: clicks > 0 ? totalEvents / clicks : 0,
    pageviewToImpression: impressions > 0 ? pageViews / impressions : 0,
  };

  const descriptions = {
    revenuePerVisitor: `${formatEventList(visitorEvents, '방문 이벤트')} 대비 수익 (${formatNumber(visitors)}명 기준)`,
    eventsPerClick: `${formatNumber(totalEvents)}건 ÷ 수익 클릭 ${formatNumber(clicks)}회`,
    pageviewToImpression: `${formatEventList(pageViewEvents, '페이지 뷰 이벤트')} ÷ 노출 ${formatNumber(impressions)}`,
  };

  const valueRenderers = {
    revenuePerVisitor: (value) => `$${formatDecimal(value, 3)}`,
    eventsPerClick: (value) => formatDecimal(value, 2),
    pageviewToImpression: (value) => formatPercent(value),
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {CARD_CONFIG.map((card) => {
        const value = derived[card.key] || 0;
        const render = valueRenderers[card.key];
        return (
          <div
            key={card.key}
            className={clsx(
              'rounded-2xl border bg-slate-950/70 p-5 shadow-lg shadow-black/20',
              card.border,
              `bg-gradient-to-br ${card.accent}`
            )}
          >
            <p className="text-xs uppercase tracking-[0.3em] text-slate-300">{card.title}</p>
            <p className="mt-3 text-3xl font-extrabold text-white">{render(value)}</p>
            <p className="mt-2 text-xs text-slate-400">{descriptions[card.key]}</p>
          </div>
        );
      })}
    </div>
  );
}
