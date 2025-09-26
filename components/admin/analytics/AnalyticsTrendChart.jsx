import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function TrendTooltip({ active, payload, label, formatNumber }) {
  if (!active || !payload?.length) return null;
  const views = payload.find((item) => item.dataKey === 'views');
  const likes = payload.find((item) => item.dataKey === 'likes');
  return (
    <div className="rounded-lg border border-slate-800/70 bg-slate-950/90 px-3 py-2 text-xs text-slate-200 shadow-lg">
      <p className="font-semibold text-white">{label}</p>
      <p className="mt-1">조회수: {formatNumber(views?.value || 0)}</p>
      <p>좋아요: {formatNumber(likes?.value || 0)}</p>
    </div>
  );
}

export default function AnalyticsTrendChart({ history, formatNumber }) {
  const sanitizedHistory = useMemo(
    () =>
      Array.isArray(history)
        ? history
            .map((entry) => ({
              date: entry?.date || '',
              views: Number(entry?.views) || 0,
              likes: Number(entry?.likes) || 0,
            }))
            .filter((entry) => entry.date)
        : [],
    [history]
  );

  if (!sanitizedHistory.length) {
    return null;
  }

  const maxValue = Math.max(...sanitizedHistory.map((entry) => Math.max(entry.views, entry.likes)), 0);

  return (
    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-4 shadow-inner shadow-black/30">
      <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
        <span>기간별 추이</span>
        <div className="flex items-center gap-3 text-[11px] tracking-normal text-slate-300">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-indigo-400" /> 조회수
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-rose-400" /> 좋아요
          </span>
        </div>
      </div>
      <div className="relative h-72 w-full">
        <ResponsiveContainer>
          <AreaChart data={sanitizedHistory} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="analyticsViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(99, 102, 241, 0.55)" />
                <stop offset="100%" stopColor="rgba(99, 102, 241, 0)" />
              </linearGradient>
              <linearGradient id="analyticsLikes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(244, 114, 182, 0.55)" />
                <stop offset="100%" stopColor="rgba(244, 114, 182, 0)" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148, 163, 184, 0.18)" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="date" stroke="rgba(148, 163, 184, 0.6)" tickLine={false} />
            <YAxis
              stroke="rgba(148, 163, 184, 0.6)"
              tickLine={false}
              tickFormatter={(value) => formatNumber(Math.round(value))}
              allowDecimals={false}
            />
            <Tooltip content={(props) => <TrendTooltip {...props} formatNumber={formatNumber} />} />
            <Legend wrapperStyle={{ color: 'rgba(226, 232, 240, 0.9)' }} />
            <Area
              type="monotone"
              dataKey="views"
              stroke="rgb(99, 102, 241)"
              strokeWidth={3}
              fill="url(#analyticsViews)"
              dot={{ r: 3 }}
              name="조회수"
            />
            <Area
              type="monotone"
              dataKey="likes"
              stroke="rgb(244, 114, 182)"
              strokeWidth={3}
              fill="url(#analyticsLikes)"
              dot={{ r: 3 }}
              name="좋아요"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-slate-400 sm:grid-cols-4">
        {sanitizedHistory.map((entry) => (
          <div key={entry.date} className="flex flex-col rounded-lg bg-slate-950/40 px-2 py-1">
            <span className="text-slate-300">{entry.date}</span>
            <span className="text-[10px] text-slate-500">조회수 {formatNumber(entry.views)}</span>
            <span className="text-[10px] text-slate-500">좋아요 {formatNumber(entry.likes)}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 text-right text-[11px] uppercase tracking-[0.3em] text-slate-500">
        최대값 {formatNumber(maxValue)}
      </div>
    </div>
  );
}
