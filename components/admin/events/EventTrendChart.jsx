import { useMemo } from 'react';

function buildPoints(series, width, height, padding) {
  if (!Array.isArray(series) || !series.length) return '';
  const max = Math.max(...series.map((entry) => Number(entry.count) || 0), 0);
  if (max <= 0) {
    return series
      .map((_, index) => {
        const x = padding + (index / Math.max(series.length - 1, 1)) * (width - padding * 2);
        const y = height - padding;
        return `${x},${y}`;
      })
      .join(' ');
  }
  return series
    .map((entry, index) => {
      const value = Math.max(0, Number(entry.count) || 0);
      const x = padding + (index / Math.max(series.length - 1, 1)) * (width - padding * 2);
      const y = padding + (1 - value / max) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');
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

  const width = 720;
  const height = 240;
  const padding = 32;
  const points = buildPoints(sanitized, width, height, padding);
  const maxValue = Math.max(...sanitized.map((entry) => entry.count), 0);

  return (
    <div className="rounded-2xl border border-slate-800/70 bg-slate-900/80 p-4 shadow-inner shadow-black/40">
      <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
        <span>기간별 이벤트 추이</span>
        <span className="text-[11px] text-slate-300">최대 {formatNumber(maxValue)}건</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <defs>
          <linearGradient id="eventTrend" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(129, 140, 248, 0.6)" />
            <stop offset="100%" stopColor="rgba(129, 140, 248, 0)" />
          </linearGradient>
        </defs>
        <rect
          x={padding}
          y={padding}
          width={width - padding * 2}
          height={height - padding * 2}
          fill="transparent"
          stroke="rgba(148, 163, 184, 0.25)"
          strokeDasharray="4 4"
        />
        {points && (
          <>
            <polyline
              points={points}
              fill="none"
              stroke="rgb(129, 140, 248)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polygon
              points={`${points} ${padding + (width - padding * 2)},${height - padding} ${padding},${height - padding}`}
              fill="url(#eventTrend)"
              opacity="0.4"
            />
          </>
        )}
      </svg>
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
