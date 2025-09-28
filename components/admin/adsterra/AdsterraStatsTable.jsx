import { ADSTERRA_ALL_PLACEMENTS_VALUE } from '../../../hooks/admin/useAdsterraStats';

export default function AdsterraStatsTable({
  rows,
  loading,
  formatNumber,
  formatCurrency,
  placementLabelMap,
  selectedPlacementId,
  activeFilters,
}) {
  const allSelected = selectedPlacementId === ADSTERRA_ALL_PLACEMENTS_VALUE;
  const hasActiveFilters = Boolean(
    activeFilters && Object.values(activeFilters).some((value) => Boolean(value))
  );
  const showExtendedColumns = hasActiveFilters || !allSelected;

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800/70 bg-slate-950/75 shadow-xl shadow-slate-950/40">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800/70 text-sm">
          <thead className="bg-slate-950/70 text-left text-xs uppercase tracking-[0.35em] text-slate-400">
            <tr>
              <th className="px-5 py-3 font-semibold">날짜</th>
              <th className="px-5 py-3 font-semibold">포맷</th>
              {showExtendedColumns && (
                <>
                  <th className="px-5 py-3 font-semibold">국가</th>
                  <th className="px-5 py-3 font-semibold">OS</th>
                  <th className="px-5 py-3 font-semibold">디바이스</th>
                  <th className="px-5 py-3 font-semibold">디바이스 포맷</th>
                  <th className="px-5 py-3 text-right font-semibold">클릭수</th>
                </>
              )}
              <th className="px-5 py-3 text-right font-semibold">노출 수</th>
              <th className="px-5 py-3 text-right font-semibold">평균 CPM</th>
              <th className="px-5 py-3 text-right font-semibold">수익</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.map((row, index) => {
              const impressions = Number(row?.impression ?? row?.impressions ?? 0) || 0;
              const clicks = Number(row?.clicks ?? row?.click ?? 0) || 0;
              const revenue = Number(row?.revenue ?? 0) || 0;
              const cpmRaw =
                Number(
                  row?.cpm ??
                    (impressions > 0 && revenue >= 0 ? (revenue / impressions) * 1000 : 0)
                ) || 0;
              const dateLabel = row?.localDate || row?.date || row?.day || row?.Day || row?.group || `#${index + 1}`;
              const dateDetail = row?.localDateLabel || dateLabel;
              const countryLabel = row?.country ?? row?.Country ?? row?.geo ?? row?.Geo ?? '—';
              const osLabel = row?.os ?? row?.OS ?? row?.platform ?? row?.Platform ?? '—';
              const deviceLabel = row?.device ?? row?.Device ?? row?.device_type ?? row?.deviceType ?? '—';
              const deviceFormatLabel =
                row?.device_format ?? row?.deviceFormat ?? row?.DeviceFormat ?? '—';
              const placementId =
                row?.placement_id ?? row?.placementId ?? row?.placementID ?? row?.placementid;
              const placementName =
                row?.placement_name ??
                row?.placement ??
                row?.placementName ??
                row?.ad_format ??
                '';
              const placementDisplay =
                placementName ||
                (placementId !== undefined && placementId !== null
                  ? placementLabelMap.get(String(placementId)) || ''
                  : '') ||
                (allSelected
                  ? 'Smartlink + 300x250'
                  : placementLabelMap.get(String(selectedPlacementId)) || '—');
              const rowKey = `${row?.localDateIso || dateLabel}-${index}-${placementId ?? ''}-${countryLabel}-${osLabel}-${deviceLabel}-${deviceFormatLabel}`;
              return (
                <tr key={rowKey} className="hover:bg-slate-900/60">
                  <td className="px-5 py-3 font-semibold text-slate-100" title={dateDetail}>
                    {dateLabel}
                  </td>
                  <td className="px-5 py-3 text-slate-100">{placementDisplay}</td>
                  {showExtendedColumns && (
                    <>
                      <td className="px-5 py-3 text-slate-200">{countryLabel}</td>
                      <td className="px-5 py-3 text-slate-200">{osLabel}</td>
                      <td className="px-5 py-3 text-slate-200">{deviceLabel}</td>
                      <td className="px-5 py-3 text-slate-200">{deviceFormatLabel}</td>
                      <td className="px-5 py-3 text-right text-slate-100">{formatNumber(clicks)}</td>
                    </>
                  )}
                  <td className="px-5 py-3 text-right text-slate-100">{formatNumber(impressions)}</td>
                  <td className="px-5 py-3 text-right text-slate-100">{formatCurrency(cpmRaw, 3)}</td>
                  <td className="px-5 py-3 text-right text-slate-100">{formatCurrency(revenue, 3)}</td>
                </tr>
              );
            })}
            {!rows.length && !loading && (
              <tr>
                <td colSpan={showExtendedColumns ? 10 : 5} className="px-5 py-12 text-center text-sm text-slate-400">
                  통계를 불러오면 기간별 노출 · 수익 지표가 여기에 정렬됩니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {loading && (
        <div className="border-t border-slate-800/70 bg-slate-900/70 px-5 py-3 text-right text-xs text-slate-400">
          통계를 정리하는 중입니다…
        </div>
      )}
    </div>
  );
}
