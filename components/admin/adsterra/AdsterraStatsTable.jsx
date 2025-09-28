import {
  ADSTERRA_ALL_PLACEMENTS_VALUE,
  ADSTERRA_PLACEMENT_PRESETS,
} from '../../../hooks/admin/useAdsterraStats';

const FRIENDLY_FORMAT_LABELS = ADSTERRA_PLACEMENT_PRESETS.reduce((acc, preset) => {
  acc[preset.id] = preset.label;
  return acc;
}, {});

const parseNumericMetric = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const normalized = typeof value === 'string' ? value.replace(/,/g, '') : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

function normalizeRow(row, placementLabelMap) {
  const dateLabel = row?.localDateLabel || row?.localDate || row?.date || row?.day || row?.Day || row?.group;
  const dateIso = row?.localDateIso || dateLabel;
  const impressions = parseNumericMetric(row?.impressionsValue ?? row?.impression ?? row?.impressions);
  const revenue = parseNumericMetric(row?.revenueValue ?? row?.revenue ?? row?.earnings ?? row?.income);
  const cpm = impressions > 0 ? (revenue / impressions) * 1000 : 0;

  const placementId = row?.placement_id ?? row?.placementId ?? row?.placementID ?? row?.placementid;
  const placementKey = placementId !== undefined && placementId !== null ? String(placementId) : '';
  const friendlyLabel =
    FRIENDLY_FORMAT_LABELS[placementKey] ||
    placementLabelMap.get(placementKey) ||
    row?.placement_name ||
    row?.placement ||
    row?.placementName ||
    row?.ad_format ||
    row?.format ||
    (placementKey ? `기타(${placementKey})` : '포맷 미지정');

  return {
    dateLabel,
    dateIso,
    impressions,
    revenue,
    cpm,
    placementLabel: friendlyLabel,
  };
}

function buildTableRows(rows, placementLabelMap, selectedPlacementId) {
  if (!Array.isArray(rows) || !rows.length) {
    return [];
  }

  const normalized = rows
    .map((row) => normalizeRow(row, placementLabelMap))
    .filter((row) => row.dateLabel);

  if (selectedPlacementId === ADSTERRA_ALL_PLACEMENTS_VALUE) {
    const bucket = new Map();
    normalized.forEach((row) => {
      const key = row.dateIso || row.dateLabel;
      const current = bucket.get(key) || {
        dateLabel: row.dateLabel,
        dateIso: row.dateIso,
        impressions: 0,
        revenue: 0,
      };
      current.impressions += row.impressions;
      current.revenue += row.revenue;
      bucket.set(key, current);
    });

    return Array.from(bucket.values())
      .map((row) => ({
        ...row,
        cpm: row.impressions > 0 ? (row.revenue / row.impressions) * 1000 : 0,
        placementLabel: '스마트링크 + 배너광고',
      }))
      .sort((a, b) => new Date(a.dateIso || a.dateLabel) - new Date(b.dateIso || b.dateLabel));
  }

  return normalized.sort((a, b) => new Date(a.dateIso || a.dateLabel) - new Date(b.dateIso || b.dateLabel));
}

export default function AdsterraStatsTable({
  rows,
  loading,
  formatNumber,
  formatCurrency,
  placementLabelMap,
  selectedPlacementId,
}) {
  const displayRows = buildTableRows(rows, placementLabelMap, selectedPlacementId);
  const hasData = displayRows.length > 0;

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-800/70 bg-slate-950/75 shadow-xl shadow-slate-950/40">
      <header className="flex flex-col gap-2 border-b border-slate-800/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-base font-semibold text-white">원시 통계 표</h4>
          <p className="text-sm text-slate-400">
            {selectedPlacementId === ADSTERRA_ALL_PLACEMENTS_VALUE
              ? '스마트링크와 배너광고를 합산해 날짜 기준으로 정리했습니다.'
              : '선택한 포맷의 일별 지표를 확인할 수 있습니다.'}
          </p>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800/60 text-sm">
          <thead className="bg-slate-950/70 text-left text-xs uppercase tracking-[0.3em] text-slate-500">
            <tr>
              <th className="px-6 py-3 font-semibold">날짜</th>
              <th className="px-6 py-3 font-semibold">포맷</th>
              <th className="px-6 py-3 text-right font-semibold">노출</th>
              <th className="px-6 py-3 text-right font-semibold">CPM</th>
              <th className="px-6 py-3 text-right font-semibold">수익</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {displayRows.map((row) => (
              <tr key={`${row.dateIso || row.dateLabel}-${row.placementLabel}`} className="hover:bg-slate-900/60">
                <td className="px-6 py-3 font-semibold text-slate-100">{row.dateLabel}</td>
                <td className="px-6 py-3 text-slate-200">{row.placementLabel}</td>
                <td className="px-6 py-3 text-right text-slate-100">{formatNumber(row.impressions)}</td>
                <td className="px-6 py-3 text-right text-slate-100">{formatCurrency(row.cpm, 3)}</td>
                <td className="px-6 py-3 text-right text-slate-100">{formatCurrency(row.revenue)}</td>
              </tr>
            ))}
            {!hasData && !loading && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                  조건에 맞는 통계가 없습니다. 날짜 범위나 포맷을 다시 선택해 보세요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && (
        <div className="border-t border-slate-800/70 bg-slate-900/70 px-6 py-3 text-right text-xs text-slate-400">
          통계를 불러오는 중입니다…
        </div>
      )}
    </section>
  );
}
