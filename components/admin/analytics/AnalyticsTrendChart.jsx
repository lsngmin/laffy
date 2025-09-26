import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useMemo } from 'react';

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .map((entry) => ({
      date: entry?.date || '',
      views: Number(entry?.views) || 0,
      likes: Number(entry?.likes) || 0,
    }))
    .filter((entry) => Boolean(entry.date));
}

function AnalyticsTooltip({ active, payload, label, formatNumber }) {
  if (!active || !payload || !payload.length) return null;
  const views = payload.find((item) => item.dataKey === 'views');
  const likes = payload.find((item) => item.dataKey === 'likes');
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-950/90 px-3 py-2 text-xs text-slate-200 shadow-lg shadow-black/30">
      <p className="font-semibold text-white">{label}</p>
      <p className="mt-1">조회수 {formatNumber(views?.value || 0)}</p>
      <p>좋아요 {formatNumber(likes?.value || 0)}</p>
    </div>
  );
}

export default function AnalyticsTrendChart({ history, formatNumber }) {
  const data = useMemo(() => normalizeHistory(history), [history]);
  if (!data.length) {
    return null;
  }

  const maxViews = Math.max(...data.map((entry) => entry.views), 0);
  const maxLikes = Math.max(...data.map((entry) => entry.likes), 0);
  const yMax = Math.max(maxViews, maxLikes, 1);

  return (
    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-4 shadow-inner shadow-black/30">
      <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
        <span>기간별 추이</span>
        <span className="tracking-normal text-slate-300">최대 {formatNumber(yMax)}</span>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
            <XAxis dataKey="date" stroke="rgba(148, 163, 184, 0.5)" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis stroke="rgba(148, 163, 184, 0.5)" tickFormatter={(value) => formatNumber(value)} tick={{ fontSize: 11 }} />
            <Tooltip content={<AnalyticsTooltip formatNumber={formatNumber} />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="views" stroke="#60a5fa" strokeWidth={2.5} dot={false} name="조회수" />
            <Line type="monotone" dataKey="likes" stroke="#f472b6" strokeWidth={2} dot={false} name="좋아요" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
