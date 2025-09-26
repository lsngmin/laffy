import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

function TrendTooltip({ active, payload, label, formatNumber }) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value || 0;
  return (
    <div className="rounded-lg border border-slate-800/70 bg-slate-950/90 px-3 py-2 text-xs text-slate-200 shadow-lg">
      <p className="font-semibold text-white">{label}</p>
      <p className="mt-1">이벤트 수: {formatNumber(value)}</p>
    </div>
  );
}

export default function EventTrendChart({ series, formatNumber }) {
  const sanitized = useMemo(() => {
    if (!Array.isArray(series)) return [];
    return series
      .map((entry) => ({
        date: entry?.date || '',
        count: Number(entry?.count) || 0,
      }))
      .filter((entry) => Boolean(entry.date));
  }, [series]);

  if (!sanitized.length) {
    return null;
  }

  const maxValue = Math.max(...sanitized.map((entry) => entry.count), 0);

  return (
    <div className="rounded-2xl border border-slate-800/70 bg-slate-900/80 p-4 shadow-inner shadow-black/40">
      <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
        <span>기간별 이벤트 추이</span>
        <span className="text-[11px] text-slate-300">최대 {formatNumber(maxValue)}건</span>
      </div>
      <div className="relative h-64 w-full">
        <ResponsiveContainer>
          <AreaChart data={sanitized} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="eventTrend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(129, 140, 248, 0.65)" />
                <stop offset="100%" stopColor="rgba(129, 140, 248, 0)" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148, 163, 184, 0.2)" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="date" stroke="rgba(148, 163, 184, 0.6)" tickLine={false} />
            <YAxis
              stroke="rgba(148, 163, 184, 0.6)"
              tickLine={false}
              allowDecimals={false}
              tickFormatter={(value) => formatNumber(Math.round(value))}
            />
            <Tooltip content={(props) => <TrendTooltip {...props} formatNumber={formatNumber} />} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="rgb(129, 140, 248)"
              strokeWidth={3}
              fill="url(#eventTrend)"
              dot={{ r: 3 }}
              name="이벤트 수"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-slate-400 sm:grid-cols-4">
        {sanitized.map((entry) => (
          <div key={entry.date} className="rounded-lg bg-slate-950/40 px-3 py-2">
            <p className="font-semibold text-slate-200">{entry.date}</p>
            <p className="text-[10px] text-slate-400">{formatNumber(entry.count)}회</p>
          </div>
        ))}
      </div>
    </div>
  );
}
