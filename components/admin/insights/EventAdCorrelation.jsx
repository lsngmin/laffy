import { useMemo } from 'react';

function normalizeSeries(series) {
  if (!Array.isArray(series)) return [];
  return series
    .map((entry) => ({
      date: entry?.date || '',
      count: Number(entry?.count) || 0,
      impressions: Number(entry?.impressions) || 0,
      clicks: Number(entry?.clicks) || 0,
      revenue: Number(entry?.revenue) || 0,
    }))
    .filter((entry) => Boolean(entry.date));
}

function pearsonCorrelation(pairs) {
  if (!pairs.length) return 0;
  const n = pairs.length;
  const sumX = pairs.reduce((acc, pair) => acc + pair.x, 0);
  const sumY = pairs.reduce((acc, pair) => acc + pair.y, 0);
  const sumXY = pairs.reduce((acc, pair) => acc + pair.x * pair.y, 0);
  const sumX2 = pairs.reduce((acc, pair) => acc + pair.x * pair.x, 0);
  const sumY2 = pairs.reduce((acc, pair) => acc + pair.y * pair.y, 0);
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (!Number.isFinite(denominator) || denominator === 0) return 0;
  const value = numerator / denominator;
  if (!Number.isFinite(value)) return 0;
  return Math.max(-1, Math.min(1, value));
}

function combineSeries(eventSeries, adSeries) {
  const eventMap = new Map();
  eventSeries.forEach((entry) => {
    eventMap.set(entry.date, { eventCount: entry.count, valueSum: Number(entry.valueSum) || 0 });
  });
  const adMap = new Map();
  adSeries.forEach((entry) => {
    adMap.set(entry.date, {
      impressions: entry.impressions,
      clicks: entry.clicks,
      revenue: entry.revenue,
    });
  });
  const dates = new Set([...eventMap.keys(), ...adMap.keys()]);
  return Array.from(dates)
    .sort((a, b) => a.localeCompare(b))
    .map((date) => {
      const eventInfo = eventMap.get(date) || { eventCount: 0, valueSum: 0 };
      const adInfo = adMap.get(date) || { impressions: 0, clicks: 0, revenue: 0 };
      return {
        date,
        eventCount: eventInfo.eventCount,
        valueSum: eventInfo.valueSum,
        impressions: adInfo.impressions,
        clicks: adInfo.clicks,
        revenue: adInfo.revenue,
      };
    });
}

export default function EventAdCorrelation({ eventSeries, adSeries, formatNumber, formatDecimal }) {
  const normalizedEvents = useMemo(() => normalizeSeries(eventSeries), [eventSeries]);
  const normalizedAds = useMemo(() => normalizeSeries(adSeries), [adSeries]);

  const combined = useMemo(() => combineSeries(normalizedEvents, normalizedAds), [normalizedAds, normalizedEvents]);

  const revenueCorrelation = useMemo(() => {
    const pairs = combined
      .filter((row) => row.eventCount > 0 && row.revenue > 0)
      .map((row) => ({ x: row.eventCount, y: row.revenue }));
    return pearsonCorrelation(pairs);
  }, [combined]);

  const clickCorrelation = useMemo(() => {
    const pairs = combined
      .filter((row) => row.eventCount > 0 && row.clicks > 0)
      .map((row) => ({ x: row.eventCount, y: row.clicks }));
    return pearsonCorrelation(pairs);
  }, [combined]);

  if (!combined.length) {
    return (
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-6 text-sm text-slate-400">
        기간 내 광고 데이터와 이벤트 데이터를 모두 불러오면 상관관계를 분석할 수 있어요.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800/60 bg-slate-900/70 p-6 shadow-inner shadow-black/30">
      <div className="flex flex-col gap-2 text-sm text-slate-200 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">이벤트-광고 상관분석</p>
          <p className="text-lg font-semibold text-white">일자별 이벤트 수와 광고 지표 비교</p>
        </div>
        <div className="flex gap-3 text-xs text-slate-300">
          <span className="rounded-full bg-slate-950/60 px-3 py-1">수익 상관계수 {formatDecimal(revenueCorrelation, 3)}</span>
          <span className="rounded-full bg-slate-950/60 px-3 py-1">클릭 상관계수 {formatDecimal(clickCorrelation, 3)}</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800/60 text-xs">
          <thead className="bg-slate-900/60 uppercase tracking-[0.2em] text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left">날짜</th>
              <th className="px-3 py-2 text-right">이벤트 수</th>
              <th className="px-3 py-2 text-right">광고 노출</th>
              <th className="px-3 py-2 text-right">광고 클릭</th>
              <th className="px-3 py-2 text-right">광고 수익</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 text-slate-200">
            {combined.map((row) => (
              <tr key={row.date} className="hover:bg-slate-900/50">
                <td className="px-3 py-2 font-semibold text-white">{row.date}</td>
                <td className="px-3 py-2 text-right">{formatNumber(row.eventCount)}</td>
                <td className="px-3 py-2 text-right">{formatNumber(row.impressions)}</td>
                <td className="px-3 py-2 text-right">{formatNumber(row.clicks)}</td>
                <td className="px-3 py-2 text-right">{formatDecimal(row.revenue, 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
