import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useMemo } from 'react';

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
      <p className="mt-1">이벤트 {formatNumber(first?.value || 0)}회</p>
    </div>
  );
}

export default function EventTrendChart({ series, formatNumber }) {
  const data = useMemo(() => normalizeSeries(series), [series]);
  if (!data.length) {
    return null;
  }

  const maxValue = Math.max(...data.map((entry) => entry.count), 0);

  return (
    <div className="rounded-2xl border border-slate-800/70 bg-slate-900/80 p-4 shadow-inner shadow-black/40">
      <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
        <span>기간별 이벤트 추이</span>
        <span className="text-[11px] text-slate-300">최대 {formatNumber(maxValue)}건</span>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
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
            <Area type="monotone" dataKey="count" stroke="#818cf8" fill="url(#eventTrendFill)" strokeWidth={2.5} name="이벤트" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
