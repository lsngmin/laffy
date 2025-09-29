import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useEffect, useMemo, useState } from 'react';

const INTERVALS = [
  { key: 'tenMinute', label: '10분' },
  { key: 'daily', label: '일별' },
  { key: 'weekly', label: '주별' },
  { key: 'monthly', label: '월별' },
];

function normalizeSeries(series) {
  if (!Array.isArray(series)) return [];
  return series
    .map((entry) => ({
      date: entry?.date || '',
      count: Number(entry?.count) || 0,
    }))
    .filter((entry) => Boolean(entry.date));
}

function EventTooltip({ active, payload, label, formatNumber }) {
  if (!active || !payload || !payload.length) return null;
  const first = payload[0];
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-950/90 px-3 py-2 text-xs text-slate-200 shadow-lg shadow-black/30">
      <p className="font-semibold text-white">{label}</p>
      <p className="mt-1">방문 {formatNumber(first?.value || 0)}회</p>
    </div>
  );
}

export default function EventTrendChart({ seriesByGranularity, formatNumber }) {
  const [activeInterval, setActiveInterval] = useState('daily');

  useEffect(() => {
    const current = seriesByGranularity?.[activeInterval];
    if (Array.isArray(current) && current.length > 0) {
      return;
    }
    const fallback = INTERVALS.find(
      (interval) => Array.isArray(seriesByGranularity?.[interval.key]) && seriesByGranularity[interval.key].length > 0
    );
    if (fallback && fallback.key !== activeInterval) {
      setActiveInterval(fallback.key);
    }
  }, [activeInterval, seriesByGranularity]);

  const selectedSeries = useMemo(() => {
    const raw = seriesByGranularity?.[activeInterval];
    const normalized = normalizeSeries(raw);
    if (normalized.length) {
      return normalized;
    }
    const fallback = INTERVALS.find((interval) => Array.isArray(seriesByGranularity?.[interval.key]) && seriesByGranularity[interval.key].length);
    return normalizeSeries(fallback ? seriesByGranularity[fallback.key] : []);
  }, [activeInterval, seriesByGranularity]);

  const availableIntervals = useMemo(
    () =>
      INTERVALS.map((interval) => ({
        ...interval,
        disabled: !Array.isArray(seriesByGranularity?.[interval.key]) || seriesByGranularity[interval.key].length === 0,
      })),
    [seriesByGranularity]
  );

  if (!selectedSeries.length) {
    return (
      <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4 text-center text-xs text-slate-500">
        아직 집계된 방문 데이터가 없어요.
      </div>
    );
  }

  const maxValue = Math.max(...selectedSeries.map((entry) => entry.count), 0);

  return (
    <div className="rounded-2xl border border-slate-800/70 bg-slate-900/80 p-4 shadow-inner shadow-black/40">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.3em] text-slate-400">
        <span>방문 추이</span>
        <div className="flex gap-2">
          {availableIntervals.map((interval) => (
            <button
              key={interval.key}
              type="button"
              onClick={() => setActiveInterval(interval.key)}
              disabled={interval.disabled}
              className={`rounded-full px-3 py-1 text-[11px] tracking-wide transition ${
                activeInterval === interval.key
                  ? 'bg-violet-500/30 text-violet-100'
                  : interval.disabled
                  ? 'bg-slate-800/40 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
              }`}
            >
              {interval.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer>
          <AreaChart data={selectedSeries} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="eventTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(129, 140, 248, 0.6)" />
                <stop offset="100%" stopColor="rgba(129, 140, 248, 0)" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
            <XAxis dataKey="date" stroke="rgba(148, 163, 184, 0.5)" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis stroke="rgba(148, 163, 184, 0.5)" tickFormatter={(value) => formatNumber(value)} tick={{ fontSize: 11 }} />
            <Tooltip content={<EventTooltip formatNumber={formatNumber} />} />
            <Area type="monotone" dataKey="count" stroke="#818cf8" fill="url(#eventTrendFill)" strokeWidth={2.5} name="방문" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-right text-[11px] text-slate-400">최대 {formatNumber(maxValue)}건</div>
    </div>
  );
}
