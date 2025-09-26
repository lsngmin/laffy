import { useMemo } from 'react';

function normalizeDate(value) {
  if (!value) return '';
  const str = String(value).trim();
  if (!str) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const parsed = new Date(str);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

function aggregateAdStats(stats) {
  const map = new Map();
  if (!Array.isArray(stats)) return map;
  stats.forEach((row) => {
    const dateKey = normalizeDate(row?.date || row?.day || row?.Day || row?.group);
    if (!dateKey) return;
    const impressions = Number(row?.impression ?? row?.impressions ?? 0) || 0;
    const clicks = Number(row?.clicks ?? row?.click ?? 0) || 0;
    const revenue = Number(row?.revenue ?? 0) || 0;
    const current = map.get(dateKey) || { impressions: 0, clicks: 0, revenue: 0 };
    current.impressions += impressions;
    current.clicks += clicks;
    current.revenue += revenue;
    map.set(dateKey, current);
  });
  return map;
}

function computeCorrelation(pairs) {
  if (!Array.isArray(pairs) || pairs.length < 2) return null;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;
  pairs.forEach(([x, y]) => {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  });
  const n = pairs.length;
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (!denominator || Number.isNaN(denominator)) return null;
  const value = numerator / denominator;
  if (Number.isNaN(value)) return null;
  return Math.max(-1, Math.min(1, value));
}

function formatNumber(value, fraction = 0) {
  try {
    return new Intl.NumberFormat('ko-KR', { maximumFractionDigits: fraction }).format(Number(value) || 0);
  } catch (error) {
    return String(value || 0);
  }
}

export default function AdEventInsightsPanel({
  events,
  selectedEventId,
  onSelectEvent,
  adStats,
  loadingEvents,
  loadingAds,
}) {
  const eventOptions = useMemo(() => {
    if (!Array.isArray(events)) return [];
    return events.map((event) => ({
      id: event.id,
      label: event.slug ? `${event.name} · ${event.slug}` : event.name,
    }));
  }, [events]);

  const selectedEvent = useMemo(() => {
    if (!Array.isArray(events)) return null;
    if (!selectedEventId) return events[0] || null;
    return events.find((event) => event.id === selectedEventId) || events[0] || null;
  }, [events, selectedEventId]);

  const adDaily = useMemo(() => aggregateAdStats(adStats), [adStats]);

  const correlationData = useMemo(() => {
    if (!selectedEvent) return { pairs: [], totals: { events: 0, revenue: 0, impressions: 0 } };
    const pairs = [];
    let totalEvents = 0;
    let totalRevenue = 0;
    let totalImpressions = 0;
    const history = Array.isArray(selectedEvent.history) ? selectedEvent.history : [];
    history.forEach((entry) => {
      const dateKey = normalizeDate(entry.date);
      if (!dateKey) return;
      const eventCount = Number(entry.count) || 0;
      const adEntry = adDaily.get(dateKey);
      if (adEntry) {
        pairs.push([eventCount, adEntry.revenue]);
        totalRevenue += adEntry.revenue;
        totalImpressions += adEntry.impressions;
      }
      totalEvents += eventCount;
    });
    return { pairs, totals: { events: totalEvents, revenue: totalRevenue, impressions: totalImpressions } };
  }, [selectedEvent, adDaily]);

  const correlation = useMemo(() => computeCorrelation(correlationData.pairs), [correlationData.pairs]);

  const tableRows = useMemo(() => {
    if (!selectedEvent) return [];
    const history = Array.isArray(selectedEvent.history) ? selectedEvent.history : [];
    return history.map((entry, index) => {
      const dateKey = normalizeDate(entry.date);
      const adEntry = adDaily.get(dateKey) || { impressions: 0, clicks: 0, revenue: 0 };
      const eventCount = Number(entry.count) || 0;
      const ctr = adEntry.impressions > 0 ? (adEntry.clicks / adEntry.impressions) * 100 : 0;
      return {
        id: `${dateKey || 'unknown'}-${index}`,
        date: dateKey,
        events: eventCount,
        revenue: adEntry.revenue,
        impressions: adEntry.impressions,
        ctr,
      };
    });
  }, [selectedEvent, adDaily]);

  const loading = loadingEvents || loadingAds;

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-slate-900/70 p-6 ring-1 ring-slate-800/60">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">광고 · 이벤트 상관 분석</h3>
          <p className="text-sm text-slate-400">
            일별 광고 수익과 선택한 이벤트 발생 수의 상관성을 확인할 수 있어요.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-[0.25em] text-slate-400">이벤트 선택</span>
          <select
            value={selectedEvent?.id || ''}
            onChange={(event) => onSelectEvent?.(event.target.value)}
            className="rounded-md border border-slate-700/60 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none"
          >
            {eventOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800/60 bg-slate-950/60 p-4">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-400">이벤트 발생</div>
          <div className="mt-2 text-2xl font-bold text-slate-50">
            {formatNumber(correlationData.totals.events)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800/60 bg-slate-950/60 p-4">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-400">광고 수익 (USD)</div>
          <div className="mt-2 text-2xl font-bold text-slate-50">
            {formatNumber(correlationData.totals.revenue, 2)}
          </div>
        </div>
        <div className="rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-4">
          <div className="text-xs uppercase tracking-[0.3em] text-emerald-200">상관계수</div>
          <div className="mt-2 text-2xl font-bold text-emerald-100">
            {correlation !== null ? formatNumber(correlation, 3) : '데이터 부족'}
          </div>
          <p className="mt-2 text-xs text-emerald-200/70">
            1에 가까울수록 양의 상관, -1에 가까울수록 음의 상관입니다.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800/60">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800/60 text-sm">
            <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">날짜</th>
                <th className="px-4 py-3 text-right font-semibold">이벤트</th>
                <th className="px-4 py-3 text-right font-semibold">광고 수익 (USD)</th>
                <th className="px-4 py-3 text-right font-semibold">노출수</th>
                <th className="px-4 py-3 text-right font-semibold">CTR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {tableRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-semibold text-slate-100">{row.date || '—'}</td>
                  <td className="px-4 py-3 text-right text-slate-100">{formatNumber(row.events)}</td>
                  <td className="px-4 py-3 text-right text-slate-100">{formatNumber(row.revenue, 3)}</td>
                  <td className="px-4 py-3 text-right text-slate-100">{formatNumber(row.impressions)}</td>
                  <td className="px-4 py-3 text-right text-slate-100">{formatNumber(row.ctr, 3)}%</td>
                </tr>
              ))}
              {!tableRows.length && !loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">
                    겹치는 날짜 구간이 없어 상관 데이터를 계산할 수 없어요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className="border-t border-slate-800/60 bg-slate-900/70 px-4 py-3 text-right text-xs text-slate-400">
            데이터를 불러오는 중입니다…
          </div>
        )}
      </div>
    </div>
  );
}
