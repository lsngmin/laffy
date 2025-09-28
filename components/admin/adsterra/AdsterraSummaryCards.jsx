import { useMemo } from 'react';
import { ADSTERRA_PLACEMENT_PRESETS } from '../../../hooks/admin/useAdsterraStats';

const FRIENDLY_FORMAT_LABELS = ADSTERRA_PLACEMENT_PRESETS.reduce((acc, preset) => {
  acc[preset.id] = preset.label;
  return acc;
}, {});

function buildFormatBreakdown(rows, placementLabelMap, totals) {
  if (!Array.isArray(rows) || !rows.length) {
    return [];
  }

  const bucket = new Map();
  rows.forEach((row) => {
    if (!row || typeof row !== 'object') return;
    const placementId =
      row?.placement_id ?? row?.placementId ?? row?.placementID ?? row?.placementid;
    const placementKey = placementId !== undefined && placementId !== null ? String(placementId) : '';
    const friendlyLabel = FRIENDLY_FORMAT_LABELS[placementKey];
    const placementLabel =
      friendlyLabel ||
      placementLabelMap.get(placementKey) ||
      row?.placement_name ||
      row?.placement ||
      row?.placementName ||
      row?.ad_format ||
      row?.format ||
      (placementKey ? `기타(${placementKey})` : '포맷 미지정');

    const impressions = Number(row?.impressionsValue ?? row?.impression ?? row?.impressions ?? 0) || 0;
    const revenue = Number(row?.revenueValue ?? row?.revenue ?? row?.earnings ?? row?.income ?? 0) || 0;

    const current = bucket.get(placementLabel) || {
      label: placementLabel,
      impressions: 0,
      revenue: 0,
    };
    current.impressions += impressions;
    current.revenue += revenue;
    bucket.set(placementLabel, current);
  });

  const totalRevenue = totals.revenue || 0;
  return Array.from(bucket.values())
    .map((entry) => ({
      ...entry,
      cpm: entry.impressions > 0 ? (entry.revenue / entry.impressions) * 1000 : 0,
      share: totalRevenue > 0 ? entry.revenue / totalRevenue : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

function SummaryPill({ label, value, helper }) {
  return (
    <div className="flex min-w-[180px] flex-1 flex-col gap-1 rounded-2xl border border-slate-800/60 bg-slate-950/70 px-5 py-4 shadow-lg shadow-slate-950/30">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-lg font-semibold text-white">{value}</span>
      {helper ? <span className="text-[11px] text-slate-500">{helper}</span> : null}
    </div>
  );
}

export default function AdsterraSummaryCards({
  totals,
  rows,
  placementLabelMap = new Map(),
  formatNumber,
  formatCurrency,
  formatDecimal,
}) {
  const averageCpm = Number.isFinite(totals.cpm) ? totals.cpm : 0;
  const averageRevenuePerImpression =
    totals.impressions > 0 ? totals.revenue / totals.impressions : 0;

  const breakdown = useMemo(
    () => buildFormatBreakdown(rows, placementLabelMap, totals),
    [rows, placementLabelMap, totals]
  );

  const hasBreakdown = breakdown.length > 0;

  return (
    <section className="space-y-6 rounded-3xl border border-slate-800/70 bg-slate-950/75 p-6 shadow-xl shadow-slate-950/40">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 className="text-lg font-semibold text-white">광고 수익 한눈에 보기</h3>
        <p className="text-sm text-slate-400">
          스마트링크와 배너광고의 합계 지표를 선택한 기간 기준으로 제공합니다.
        </p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <SummaryPill
          label="총 수익"
          value={formatCurrency(totals.revenue)}
          helper="동일 기간에 발생한 광고 수익 총합"
        />
        <SummaryPill
          label="총 노출"
          value={formatNumber(totals.impressions)}
          helper={`노출당 수익 ${formatCurrency(averageRevenuePerImpression, 5)}`}
        />
        <SummaryPill
          label="평균 CPM"
          value={formatCurrency(averageCpm, 3)}
          helper="1,000회 노출 기준 예상 수익"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-5">
          <p className="text-sm font-semibold text-white">포맷별 기여도</p>
          <p className="mt-1 text-[12px] text-slate-400">
            스마트링크와 배너광고의 비중을 수익 기준으로 계산했습니다.
          </p>
          <div className="mt-4 space-y-4">
            {(hasBreakdown ? breakdown : [{ label: '데이터 없음', impressions: 0, revenue: 0, cpm: 0, share: 0 }]).map(
              (entry) => (
                <div key={entry.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-100">{entry.label}</span>
                    <span className="font-semibold text-cyan-100">{formatCurrency(entry.revenue)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500"
                      style={{ width: `${Math.max(entry.share * 100, entry.revenue > 0 ? 6 : 0)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>점유 {formatDecimal(entry.share * 100, 2)}%</span>
                    <span>CPM {formatCurrency(entry.cpm, 3)}</span>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-5">
          <p className="text-sm font-semibold text-white">날짜별 스냅샷</p>
          <p className="mt-1 text-[12px] text-slate-400">최근 데이터 일부를 빠르게 확인할 수 있습니다.</p>
          <div className="mt-4 grid gap-3 text-[12px] text-slate-300 sm:grid-cols-2">
            {Array.isArray(rows) && rows.length ? (
              rows.slice(0, 6).map((row) => {
                const label = row?.localDateLabel || row?.localDate || row?.date || row?.day || row?.Day;
                const impressions = Number(row?.impressionsValue ?? row?.impression ?? row?.impressions ?? 0) || 0;
                const revenue = Number(row?.revenueValue ?? row?.revenue ?? row?.earnings ?? row?.income ?? 0) || 0;
                const cpm = impressions > 0 ? (revenue / impressions) * 1000 : 0;
                return (
                  <div key={`${label}-${revenue}`} className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-3">
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="mt-1 text-slate-400">노출 {formatNumber(impressions)}</p>
                    <p className="mt-1 text-slate-400">수익 {formatCurrency(revenue)}</p>
                    <p className="mt-1 text-slate-400">CPM {formatCurrency(cpm, 3)}</p>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-4 text-center text-[11px] text-slate-400">
                집계된 통계가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
