import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function buildSeries(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const dateLabel = row?.kstDate || row?.date || row?.day || row?.Day || row?.group;
    if (!dateLabel) return;
    const impressions = Number(row?.impression ?? row?.impressions ?? 0) || 0;
    const clicks = Number(row?.clicks ?? row?.click ?? 0) || 0;
    const revenue = Number(row?.revenue ?? 0) || 0;
    const current = map.get(dateLabel) || { impressions: 0, clicks: 0, revenue: 0 };
    current.impressions += impressions;
    current.clicks += clicks;
    current.revenue += revenue;
    map.set(dateLabel, current);
  });
  return Array.from(map.entries())
    .map(([date, value]) => ({ date, ...value }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function ChartTooltip({ active, payload, label, formatNumber }) {
  if (!active || !payload?.length) return null;
  const impressionEntry = payload.find((item) => item.dataKey === 'impressions');
  const clickEntry = payload.find((item) => item.dataKey === 'clicks');
  const revenueEntry = payload.find((item) => item.dataKey === 'revenue');
  return (
    <div className="rounded-lg border border-slate-800/70 bg-slate-950/90 px-3 py-2 text-xs text-slate-200 shadow-lg">
      <p className="font-semibold text-white">{label}</p>
      <p className="mt-1">노출: {formatNumber(impressionEntry?.value || 0)}</p>
      <p>클릭: {formatNumber(clickEntry?.value || 0)}</p>
      <p>수익 (USD): {(revenueEntry?.value || 0).toFixed(3)}</p>
    </div>
  );
}

export default function AdsterraChartPanel({ rows, formatNumber }) {
  const series = useMemo(() => buildSeries(rows), [rows]);
  if (!series.length) {
    return (
      <div className="rounded-2xl border border-slate-800/70 bg-slate-900/80 p-6 text-sm text-slate-400">
        통계를 불러오면 추세 그래프가 표시됩니다.
      </div>
    );
  }

  const maxImpressions = Math.max(...series.map((entry) => entry.impressions), 1);

  return (
    <div className="rounded-2xl border border-slate-800/70 bg-slate-900/80 p-6">
      <div className="flex items-center justify-between text-sm">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">노출 추세</p>
          <p className="text-lg font-semibold text-white">최근 {series.length}일</p>
        </div>
        <div className="text-xs text-slate-400">최고 노출 {formatNumber(maxImpressions)}</div>
      </div>
      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer>
          <AreaChart data={series} margin={{ top: 16, right: 24, left: 0, bottom: 12 }}>
            <defs>
              <linearGradient id="adsterra-impressions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(52, 211, 153, 0.6)" />
                <stop offset="100%" stopColor="rgba(52, 211, 153, 0)" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148, 163, 184, 0.15)" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="date" stroke="rgba(148, 163, 184, 0.6)" tickLine={false} />
            <YAxis
              yAxisId="left"
              stroke="rgba(148, 163, 184, 0.6)"
              tickFormatter={(value) => formatNumber(Math.round(value))}
              allowDecimals={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="rgba(148, 163, 184, 0.4)"
              tickFormatter={(value) => value.toFixed(2)}
            />
            <Tooltip content={(props) => <ChartTooltip {...props} formatNumber={formatNumber} />} />
            <Legend wrapperStyle={{ color: 'rgba(226, 232, 240, 0.85)' }} />
            <Area
              type="monotone"
              dataKey="impressions"
              stroke="rgb(52, 211, 153)"
              strokeWidth={3}
              fill="url(#adsterra-impressions)"
              dot={{ r: 3 }}
              name="노출"
              yAxisId="left"
            />
            <Line
              type="monotone"
              dataKey="clicks"
              stroke="rgb(14, 165, 233)"
              strokeWidth={3}
              dot={{ r: 3 }}
              name="클릭"
              yAxisId="left"
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="rgb(249, 115, 22)"
              strokeWidth={2}
              dot={{ r: 2 }}
              name="수익 (USD)"
              yAxisId="right"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-400 sm:grid-cols-4">
        {series.map((entry) => (
          <div key={entry.date} className="rounded-lg bg-slate-900/60 px-3 py-2">
            <p className="font-semibold text-slate-200">{entry.date}</p>
            <p>노출 {formatNumber(entry.impressions)}</p>
            <p>클릭 {formatNumber(entry.clicks)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
