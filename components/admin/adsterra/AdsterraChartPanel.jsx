import { useMemo } from 'react';

function buildSeries(rows) {
  const map = new Map();
  rows.forEach((row) => {
    if (!row || typeof row !== 'object') return;
    const label = row?.localDate || row?.date || row?.day || row?.Day || row?.group;
    if (!label) return;
    const iso = row?.localDateIso || row?.localDate || label;
    const key = iso || label;
    const impressions = Number(row?.impression ?? row?.impressions ?? 0) || 0;
    const clicks = Number(row?.clicks ?? row?.click ?? 0) || 0;
    const revenue = Number(row?.revenue ?? 0) || 0;
    const current = map.get(key) || {
      label,
      iso,
      impressions: 0,
      clicks: 0,
      revenue: 0,
    };
    current.label = label;
    current.iso = iso;
    current.impressions += impressions;
    current.clicks += clicks;
    current.revenue += revenue;
    map.set(key, current);
  });
  return Array.from(map.values()).sort((a, b) => new Date(a.iso || a.label) - new Date(b.iso || b.label));
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

  const maxImpressions = Math.max(...series.map((value) => value.impressions), 1);
  const width = 600;
  const height = 160;
  const stepX = width / Math.max(series.length - 1, 1);

  const linePath = series
    .map((value, index) => {
      const x = index * stepX;
      const y = height - (value.impressions / maxImpressions) * height;
      return `${index === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');

  return (
    <div className="rounded-2xl border border-slate-800/70 bg-slate-900/80 p-6">
      <div className="flex items-center justify-between text-sm">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">노출 추세</p>
          <p className="text-lg font-semibold text-white">최근 {series.length}일</p>
        </div>
        <div className="text-xs text-slate-400">
          최고 노출 {formatNumber(maxImpressions)}
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 h-40 w-full">
        <defs>
          <linearGradient id="adsterra-impressions" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${linePath} L${width},${height} L0,${height} Z`} fill="url(#adsterra-impressions)" />
        <path d={linePath} stroke="#34d399" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-400 sm:grid-cols-4">
        {series.map((value) => (
          <div key={value.iso || value.label} className="rounded-lg bg-slate-900/60 px-3 py-2">
            <p className="font-semibold text-slate-200">{value.label}</p>
            <p>노출 {formatNumber(value.impressions)}</p>
            <p>클릭 {formatNumber(value.clicks)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
