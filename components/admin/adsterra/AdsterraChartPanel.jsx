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

export default function AdsterraChartPanel({ rows, formatNumber, formatCurrency }) {
  const series = useMemo(() => buildSeries(rows), [rows]);
  const metrics = useMemo(
    () =>
      series.map((value) => {
        const impressions = value.impressions || 0;
        const revenue = value.revenue || 0;
        const cpm = impressions > 0 ? (revenue / impressions) * 1000 : 0;
        const rpm = impressions > 0 ? revenue / impressions : 0;
        return { ...value, cpm, rpm };
      }),
    [series]
  );

  if (!metrics.length) {
    return (
      <div className="rounded-3xl border border-slate-800/70 bg-slate-900/80 p-6 text-sm text-slate-400">
        통계를 불러오면 고급형 추세 그래프가 표시됩니다.
      </div>
    );
  }

  const impressionsMax = Math.max(...metrics.map((value) => value.impressions), 1);
  const revenueMax = Math.max(...metrics.map((value) => value.revenue), 1);
  const cpmMax = Math.max(...metrics.map((value) => value.cpm), 1);
  const baseWidth = Math.max((metrics.length - 1) * 120, 600);
  const hasMultiplePoints = metrics.length > 1;
  const stepX = hasMultiplePoints ? baseWidth / (metrics.length - 1) : 0;
  const height = 240;

  const getX = (index) => (hasMultiplePoints ? index * stepX : baseWidth / 2);
  const buildPath = (accessor, maxValue) =>
    metrics
      .map((value, index) => {
        const raw = accessor(value);
        const clamped = Number.isFinite(raw) ? Math.max(raw, 0) : 0;
        const y = maxValue > 0 ? height - (clamped / maxValue) * height : height;
        const x = getX(index);
        return `${index === 0 ? 'M' : 'L'}${x},${y}`;
      })
      .join(' ');

  const impressionsLine = buildPath((value) => value.impressions, impressionsMax);
  const revenueLine = buildPath((value) => value.revenue, revenueMax);
  const cpmLine = buildPath((value) => value.cpm, cpmMax);
  const firstX = getX(0);
  const lastX = getX(metrics.length - 1);
  const impressionsArea = `${impressionsLine} L${lastX},${height} L${firstX},${height} Z`;

  const scatterWidth = 520;
  const scatterHeight = 200;
  const scatterMaxImpressions = Math.max(...metrics.map((value) => value.impressions), 1);
  const scatterMaxRevenue = Math.max(...metrics.map((value) => value.revenue), 1);
  const scatterMaxCpm = Math.max(...metrics.map((value) => value.cpm), 1);

  return (
    <div className="space-y-6 rounded-3xl border border-slate-800/70 bg-slate-950/80 p-6 shadow-xl shadow-slate-950/40">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-slate-400">노출 · 수익 추세</p>
          <h3 className="text-2xl font-semibold text-white">하이브리드 타임라인 분석</h3>
        </div>
        <div className="text-xs text-slate-400">
          최고 노출 {formatNumber(impressionsMax)} · 최고 수익 {formatCurrency(revenueMax)} · 최고 CPM {formatCurrency(cpmMax, 3)}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-800/70 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 p-6">
        <svg viewBox={`0 0 ${baseWidth} ${height}`} className="h-64 w-full">
          <defs>
            <linearGradient id="adsterra-impression-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(34,211,238,0.45)" />
              <stop offset="100%" stopColor="rgba(79,70,229,0)" />
            </linearGradient>
            <linearGradient id="adsterra-revenue-line" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>
            <linearGradient id="adsterra-cpm-line" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
          </defs>
          <path d={impressionsArea} fill="url(#adsterra-impression-fill)" />
          <path d={impressionsLine} stroke="#22d3ee" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d={revenueLine} stroke="url(#adsterra-revenue-line)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeDasharray="6 4" />
          <path d={cpmLine} stroke="url(#adsterra-cpm-line)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeDasharray="2 6" />
        </svg>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-2"><span className="h-2 w-6 rounded-full bg-cyan-300" />노출</span>
          <span className="inline-flex items-center gap-2"><span className="h-2 w-6 rounded-full bg-pink-400" />수익</span>
          <span className="inline-flex items-center gap-2"><span className="h-2 w-6 rounded-full bg-sky-400" />CPM</span>
        </div>
      </div>

      <div className="grid gap-4 text-[12px] text-slate-300 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-4">
          <p className="font-semibold text-slate-100">노출 ↔ CPM 상관 뷰</p>
          <svg viewBox={`0 0 ${scatterWidth} ${scatterHeight}`} className="mt-3 h-48 w-full">
            <defs>
              <linearGradient id="adsterra-scatter-cpm" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="rgba(56,189,248,0.35)" />
                <stop offset="100%" stopColor="rgba(129,140,248,0.35)" />
              </linearGradient>
            </defs>
            <rect width={scatterWidth} height={scatterHeight} fill="url(#adsterra-scatter-cpm)" opacity="0.15" />
            {metrics.map((value) => {
              const x = (value.impressions / scatterMaxImpressions) * scatterWidth;
              const y = scatterHeight - (value.cpm / scatterMaxCpm) * scatterHeight;
              const radius = Math.max(6, Math.min(14, value.rpm * 1600));
              return (
                <circle
                  key={`cpm-${value.iso || value.label}`}
                  cx={x}
                  cy={Number.isFinite(y) ? y : scatterHeight}
                  r={Number.isFinite(radius) ? radius : 6}
                  fill="rgba(56,189,248,0.65)"
                  stroke="rgba(125,211,252,0.9)"
                  strokeWidth="1.5"
                />
              );
            })}
          </svg>
          <p className="mt-2 text-[11px] text-slate-400">
            점의 크기는 평균 노출당 수익을 의미하며, 우측 상단으로 갈수록 고효율 구간이에요.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-4">
          <p className="font-semibold text-slate-100">노출 ↔ 일일 수익 분포</p>
          <svg viewBox={`0 0 ${scatterWidth} ${scatterHeight}`} className="mt-3 h-48 w-full">
            <defs>
              <linearGradient id="adsterra-scatter-revenue" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="rgba(244,114,182,0.35)" />
                <stop offset="100%" stopColor="rgba(192,132,252,0.35)" />
              </linearGradient>
            </defs>
            <rect width={scatterWidth} height={scatterHeight} fill="url(#adsterra-scatter-revenue)" opacity="0.15" />
            {metrics.map((value) => {
              const x = (value.impressions / scatterMaxImpressions) * scatterWidth;
              const y = scatterHeight - (value.revenue / scatterMaxRevenue) * scatterHeight;
              const radius = Math.max(6, Math.min(16, (value.cpm / Math.max(cpmMax, 1)) * 12));
              return (
                <circle
                  key={`revenue-${value.iso || value.label}`}
                  cx={x}
                  cy={Number.isFinite(y) ? y : scatterHeight}
                  r={Number.isFinite(radius) ? radius : 6}
                  fill="rgba(244,114,182,0.65)"
                  stroke="rgba(249,168,212,0.9)"
                  strokeWidth="1.5"
                />
              );
            })}
          </svg>
          <p className="mt-2 text-[11px] text-slate-400">
            원의 크기는 CPM을 나타내며, 오른쪽 아래 영역은 노출 대비 수익 개선 여지가 있는 지점을 의미합니다.
          </p>
        </div>
      </div>

      <div className="grid gap-3 text-[11px] text-slate-300 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((value) => (
          <div key={value.iso || value.label} className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-4">
            <p className="text-sm font-semibold text-white">{value.label}</p>
            <p className="mt-1 text-slate-400">노출 {formatNumber(value.impressions)}</p>
            <p className="mt-1 text-slate-400">수익 {formatCurrency(value.revenue)}</p>
            <p className="mt-1 text-slate-400">CPM {formatCurrency(value.cpm, 3)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
