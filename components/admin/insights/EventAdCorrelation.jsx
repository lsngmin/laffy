import { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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

function ScatterTooltip({ active, payload, label, formatNumber, formatDecimal }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  return (
    <div className="rounded-lg border border-slate-800/70 bg-slate-950/90 px-3 py-2 text-xs text-slate-200 shadow-lg">
      <p className="font-semibold text-white">{label}</p>
      <p className="mt-1">이벤트 수: {formatNumber(point?.eventCount || 0)}</p>
      <p>클릭: {formatNumber(point?.clicks || 0)}</p>
      <p>수익 (USD): {formatDecimal(point?.revenue || 0, 3)}</p>
    </div>
  );
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

  const totalEvents = combined.reduce((acc, row) => acc + row.eventCount, 0);
  const totalClicks = combined.reduce((acc, row) => acc + row.clicks, 0);
  const totalImpressions = combined.reduce((acc, row) => acc + row.impressions, 0);
  const totalRevenue = combined.reduce((acc, row) => acc + row.revenue, 0);

  const clicksPerEvent = totalEvents > 0 ? totalClicks / totalEvents : 0;
  const impressionsPerEvent = totalEvents > 0 ? totalImpressions / totalEvents : 0;
  const revenuePerEvent = totalEvents > 0 ? totalRevenue / totalEvents : 0;

  const scatterData = combined.map((row) => ({
    ...row,
    label: row.date,
  }));

  return (
    <div className="space-y-5 rounded-2xl border border-slate-800/60 bg-slate-900/70 p-6 shadow-inner shadow-black/30">
      <div className="flex flex-col gap-2 text-sm text-slate-200 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">이벤트-광고 상관분석</p>
          <p className="text-lg font-semibold text-white">일자별 이벤트 수와 광고 지표 비교</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-300">
          <span className="rounded-full bg-slate-950/60 px-3 py-1">수익 상관계수 {formatDecimal(revenueCorrelation, 3)}</span>
          <span className="rounded-full bg-slate-950/60 px-3 py-1">클릭 상관계수 {formatDecimal(clickCorrelation, 3)}</span>
        </div>
      </div>

      <div className="grid gap-3 text-sm text-slate-200 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">이벤트당 평균 클릭</p>
          <p className="mt-2 text-2xl font-semibold text-white">{formatDecimal(clicksPerEvent, 2)}</p>
          <p className="mt-1 text-xs text-slate-500">Σ clicks ÷ Σ eventCount</p>
        </div>
        <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">이벤트당 평균 노출</p>
          <p className="mt-2 text-2xl font-semibold text-white">{formatDecimal(impressionsPerEvent, 2)}</p>
          <p className="mt-1 text-xs text-slate-500">Σ impressions ÷ Σ eventCount</p>
        </div>
        <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">이벤트당 평균 수익</p>
          <p className="mt-2 text-2xl font-semibold text-white">{formatDecimal(revenuePerEvent, 3)}</p>
          <p className="mt-1 text-xs text-slate-500">Σ revenue ÷ Σ eventCount</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-4 text-xs text-slate-300">
        <p className="font-semibold text-white">해석 가이드</p>
        <ul className="mt-2 space-y-1 list-disc pl-4">
          <li>이벤트 1건이 만들어내는 클릭·노출·수익 기여도를 지표화했습니다.</li>
          <li>상관계수가 0.5 이상이면 이벤트 집약도가 광고 성과에 뚜렷한 영향을 준다고 해석할 수 있습니다.</li>
          <li>추가 이벤트 실험 시 Σ eventCount 대비 Σ clicks / Σ revenue 추세 변화를 관찰하세요.</li>
        </ul>
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 16, right: 32, left: 0, bottom: 24 }}>
            <CartesianGrid stroke="rgba(148, 163, 184, 0.15)" strokeDasharray="4 4" />
            <XAxis
              dataKey="eventCount"
              stroke="rgba(148, 163, 184, 0.6)"
              tickFormatter={(value) => formatNumber(Math.round(value))}
              name="이벤트 수"
            />
            <YAxis
              dataKey="revenue"
              orientation="right"
              stroke="rgba(148, 163, 184, 0.6)"
              tickFormatter={(value) => formatDecimal(value, 2)}
              name="수익 (USD)"
            />
            <Tooltip content={(props) => <ScatterTooltip {...props} formatNumber={formatNumber} formatDecimal={formatDecimal} />} />
            <Legend wrapperStyle={{ color: 'rgba(226, 232, 240, 0.85)' }} />
            <Scatter name="수익" data={scatterData} fill="rgb(168, 85, 247)" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
