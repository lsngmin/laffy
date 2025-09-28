import { useMemo } from 'react';

export default function AdsterraSummaryCards({
  totals,
  rows,
  placementLabelMap,
  formatNumber,
  formatDecimal,
  formatCurrency,
}) {
  const averageCpm = Number.isFinite(totals.cpm) ? totals.cpm : 0;
  const averageRevenuePerImpression =
    totals.impressions > 0 ? totals.revenue / totals.impressions : 0;

  const activeDays = useMemo(() => {
    if (!Array.isArray(rows)) return 0;
    const dates = new Set();
    rows.forEach((row) => {
      const label = row?.localDate || row?.date || row?.day || row?.Day;
      if (label) dates.add(String(label));
    });
    return dates.size;
  }, [rows]);

  const formatBreakdown = useMemo(() => {
    if (!Array.isArray(rows) || !rows.length) return [];
    const map = new Map();
    rows.forEach((row) => {
      if (!row || typeof row !== 'object') return;
      const placementId =
        row?.placement_id ??
        row?.placementId ??
        row?.placementID ??
        row?.placementid;
      const idKey = placementId !== undefined && placementId !== null ? String(placementId) : '';
      const placementLabel =
        row?.placement_name ??
        row?.placement ??
        row?.placementName ??
        row?.ad_format ??
        row?.format ??
        placementLabelMap.get(idKey) ??
        (idKey ? `#${idKey}` : '포맷 미지정');
      const key = placementLabel || placementLabelMap.get(idKey) || '포맷 미지정';
      const impressions = Number(row?.impression ?? row?.impressions ?? 0) || 0;
      const revenue = Number(row?.revenue ?? 0) || 0;
      const current = map.get(key) || { label: key, impressions: 0, revenue: 0 };
      current.impressions += impressions;
      current.revenue += revenue;
      map.set(key, current);
    });
    return Array.from(map.values())
      .map((entry) => ({
        ...entry,
        cpm: entry.impressions > 0 ? (entry.revenue / entry.impressions) * 1000 : 0,
        share: totals.revenue > 0 ? entry.revenue / totals.revenue : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [placementLabelMap, rows, totals.revenue]);

  const breakdownToDisplay = formatBreakdown.length
    ? formatBreakdown
    : [
        {
          label: '데이터 없음',
          impressions: 0,
          revenue: 0,
          cpm: 0,
          share: 0,
        },
      ];

  return (
    <div className="grid gap-4 xl:grid-cols-4">
      <div className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/25 via-sky-600/20 to-indigo-800/30 p-6 shadow-lg shadow-cyan-500/25 xl:col-span-2">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(165,243,252,0.2),transparent_60%)]"
          aria-hidden
        />
        <div className="relative space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-cyan-100/80">총 수익</p>
          <p className="text-3xl font-semibold text-white">{formatCurrency(totals.revenue)}</p>
          <p className="text-sm text-cyan-100/70">
            {activeDays > 0 ? `최근 ${activeDays}일 범위` : '기간을 선택해 통계를 확인하세요.'}
          </p>
          <p className="text-[11px] text-cyan-100/60">
            평균 노출당 수익 {formatCurrency(averageRevenuePerImpression, 5)} · 노출 {formatNumber(totals.impressions)}
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800/70 bg-slate-950/60 p-6 shadow-lg shadow-black/40">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-400">총 노출수</p>
        <p className="mt-3 text-2xl font-semibold text-white">{formatNumber(totals.impressions)}</p>
        <p className="mt-2 text-[12px] text-slate-400">
          필터를 적용한 집계 · Smartlink_1 + 300x250_1 기준
        </p>
      </div>

      <div className="rounded-3xl border border-slate-800/70 bg-slate-950/60 p-6 shadow-lg shadow-black/40">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-400">평균 CPM</p>
        <p className="mt-3 text-2xl font-semibold text-white">{formatCurrency(averageCpm, 3)}</p>
        <p className="mt-2 text-[12px] text-slate-400">
          선택한 기간 동안 1,000 노출당 예상 수익
        </p>
      </div>

      <div className="rounded-3xl border border-slate-800/70 bg-slate-950/60 p-6 shadow-lg shadow-black/40">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-400">포맷별 수익 비중</p>
        <div className="mt-4 space-y-4">
          {breakdownToDisplay.map((entry) => (
            <div key={entry.label} className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-semibold text-slate-100">{entry.label}</span>
                <span className="font-semibold text-cyan-100">{formatCurrency(entry.revenue)}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500"
                  style={{ width: `${Math.max(entry.share * 100, entry.revenue > 0 ? 6 : 0)}%` }}
                />
              </div>
              <div className="flex flex-col text-[11px] text-slate-500">
                <span>노출 {formatNumber(entry.impressions)}</span>
                <span>
                  점유 {formatDecimal(entry.share * 100, 2)}% · CPM {formatCurrency(entry.cpm, 3)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
