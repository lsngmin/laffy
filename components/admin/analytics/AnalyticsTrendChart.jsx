import { useMemo } from 'react';

function buildPolylinePoints(history, key, width, height, padding) {
  if (!history.length) return '';
  const maxValue = Math.max(...history.map((entry) => Math.max(0, Number(entry[key]) || 0)));
  if (maxValue === 0) {
    const baselineY = height - padding;
    return history
      .map((entry, index) => {
        const x = padding + (index / Math.max(1, history.length - 1)) * (width - padding * 2);
        return `${x},${baselineY}`;
      })
      .join(' ');
  }
  return history
    .map((entry, index) => {
      const value = Math.max(0, Number(entry[key]) || 0);
      const x = padding + (index / Math.max(1, history.length - 1)) * (width - padding * 2);
      const y = padding + (1 - value / maxValue) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');
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

  const width = 720;
  const height = 280;
  const padding = 32;

  const viewsPoints = buildPolylinePoints(sanitizedHistory, 'views', width, height, padding);
  const likesPoints = buildPolylinePoints(sanitizedHistory, 'likes', width, height, padding);
  const maxValue = Math.max(
    ...sanitizedHistory.map((entry) => Math.max(entry.views, entry.likes)),
    0
  );

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
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
          <defs>
            <linearGradient id="trendViews" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(99, 102, 241, 0.35)" />
              <stop offset="100%" stopColor="rgba(99, 102, 241, 0)" />
            </linearGradient>
            <linearGradient id="trendLikes" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(244, 114, 182, 0.4)" />
              <stop offset="100%" stopColor="rgba(244, 114, 182, 0)" />
            </linearGradient>
          </defs>
          <rect
            x={padding}
            y={padding}
            width={width - padding * 2}
            height={height - padding * 2}
            fill="transparent"
            stroke="rgba(148, 163, 184, 0.2)"
            strokeDasharray="4 4"
          />
          {viewsPoints && (
            <>
              <polyline
                points={viewsPoints}
                fill="none"
                stroke="rgb(99, 102, 241)"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <polygon
                points={`${viewsPoints} ${padding + (width - padding * 2)},${height - padding} ${padding},${height - padding}`}
                fill="url(#trendViews)"
                opacity="0.4"
              />
            </>
          )}
          {likesPoints && (
            <>
              <polyline
                points={likesPoints}
                fill="none"
                stroke="rgb(244, 114, 182)"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <polygon
                points={`${likesPoints} ${padding + (width - padding * 2)},${height - padding} ${padding},${height - padding}`}
                fill="url(#trendLikes)"
                opacity="0.35"
              />
            </>
          )}
        </svg>
        <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-slate-400 sm:grid-cols-4">
          {sanitizedHistory.map((entry) => (
            <div key={entry.date} className="flex flex-col rounded-lg bg-slate-950/40 px-2 py-1">
              <span className="text-slate-300">{entry.date}</span>
              <span className="text-[10px] text-slate-500">조회수 {formatNumber(entry.views)}</span>
              <span className="text-[10px] text-slate-500">좋아요 {formatNumber(entry.likes)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 text-right text-[11px] uppercase tracking-[0.3em] text-slate-500">
        최대값 {formatNumber(maxValue)}
      </div>
    </div>
  );
}
