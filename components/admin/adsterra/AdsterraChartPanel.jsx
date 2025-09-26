function buildRevenueSeries(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const dateLabel = row?.date || row?.day || row?.Day || row?.group;
    if (!dateLabel) return;
    const revenue = Number(row?.revenue ?? 0);
    if (!Number.isFinite(revenue)) return;
    map.set(dateLabel, (map.get(dateLabel) || 0) + revenue);
  });
  return Array.from(map.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

export default function AdsterraChartPanel({ rows, formatDecimal }) {
  const series = buildRevenueSeries(rows);
  if (!series.length) {
    return (
      <div className="rounded-2xl border border-slate-800/70 bg-slate-900/80 p-6 text-sm text-slate-400">
        시각화할 데이터가 없습니다.
      </div>
    );
  }

  const values = series.map((point) => point.value);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const width = 600;
  const height = 240;
  const padding = 32;
  const xStep = series.length > 1 ? (width - padding * 2) / (series.length - 1) : 0;
  const yScale = (value) => {
    if (maxValue === minValue) return height / 2;
    return padding + (height - padding * 2) * (1 - (value - minValue) / (maxValue - minValue));
  };

  const points = series.map((point, index) => ({
    x: padding + index * xStep,
    y: yScale(point.value),
    ...point,
  }));

  const pathD = points.reduce((acc, point, index) => {
    return index === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`;
  }, '');

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/80 p-6">
      <p className="text-xs uppercase tracking-widest text-slate-400">Revenue trend</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 w-full">
        <defs>
          <linearGradient id="adsterraChartGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(45,212,191,0.8)" />
            <stop offset="100%" stopColor="rgba(6,182,212,0.2)" />
          </linearGradient>
        </defs>
        <path d={pathD} fill="none" stroke="url(#adsterraChartGradient)" strokeWidth="3" strokeLinecap="round" />
        {points.map((point) => (
          <g key={point.date}>
            <circle cx={point.x} cy={point.y} r={4} fill="rgba(45,212,191,0.9)" />
            <text x={point.x} y={height - 8} textAnchor="middle" className="fill-slate-400 text-[10px]">
              {point.date}
            </text>
            <text x={point.x} y={point.y - 10} textAnchor="middle" className="fill-emerald-200 text-[10px]">
              {'$'}{formatDecimal(point.value, 2)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
