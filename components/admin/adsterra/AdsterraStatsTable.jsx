export default function AdsterraStatsTable({ rows, loading, formatNumber, formatDecimal }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-slate-900/80 ring-1 ring-slate-800/70">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800/70 text-sm">
          <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-widest text-slate-400">
            <tr>
              <th className="px-4 py-3 font-semibold">날짜</th>
              <th className="px-4 py-3 font-semibold">국가</th>
              <th className="px-4 py-3 font-semibold">광고 포맷</th>
              <th className="px-4 py-3 font-semibold">OS</th>
              <th className="px-4 py-3 font-semibold">디바이스</th>
              <th className="px-4 py-3 font-semibold">디바이스 포맷</th>
              <th className="px-4 py-3 text-right font-semibold">노출수</th>
              <th className="px-4 py-3 text-right font-semibold">클릭수</th>
              <th className="px-4 py-3 text-right font-semibold">CTR</th>
              <th className="px-4 py-3 text-right font-semibold">CPM (USD)</th>
              <th className="px-4 py-3 text-right font-semibold">수익 (USD)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.map((row, index) => {
              const impressions = Number(row?.impression ?? row?.impressions ?? 0) || 0;
              const clicks = Number(row?.clicks ?? row?.click ?? 0) || 0;
              const revenue = Number(row?.revenue ?? 0) || 0;
              const ctrRaw = Number(row?.ctr ?? ((impressions > 0 && clicks >= 0) ? (clicks / impressions) * 100 : 0)) || 0;
              const cpmRaw = Number(row?.cpm ?? ((impressions > 0 && revenue >= 0) ? (revenue / impressions) * 1000 : 0)) || 0;
              const dateLabel = row?.date || row?.day || row?.Day || row?.group || `#${index + 1}`;
              const countryLabel = row?.country ?? row?.Country ?? row?.geo ?? row?.Geo ?? '—';
              const osLabel = row?.os ?? row?.OS ?? row?.platform ?? row?.Platform ?? '—';
              const deviceLabel = row?.device ?? row?.Device ?? row?.device_type ?? row?.deviceType ?? '—';
              const deviceFormatLabel = row?.device_format ?? row?.deviceFormat ?? row?.DeviceFormat ?? '—';
              const placementIdFromRow = row?.placement_id
                ?? row?.placementId
                ?? row?.placementID
                ?? row?.placementid;
              const placementLabelRaw = row?.placement_name
                ?? row?.placement
                ?? row?.placementName
                ?? row?.ad_format
                ?? row?.adFormat
                ?? '';
              const placementDisplay = placementLabelRaw || placementIdFromRow || '—';
              const rowKey = `${dateLabel}-${index}-${placementIdFromRow ?? ''}-${countryLabel}-${osLabel}-${deviceLabel}-${deviceFormatLabel}`;
              return (
                <tr key={rowKey} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-semibold text-slate-100">{dateLabel}</td>
                  <td className="px-4 py-3 text-slate-100">{countryLabel}</td>
                  <td className="px-4 py-3 text-slate-100">{placementDisplay}</td>
                  <td className="px-4 py-3 text-slate-100">{osLabel}</td>
                  <td className="px-4 py-3 text-slate-100">{deviceLabel}</td>
                  <td className="px-4 py-3 text-slate-100">{deviceFormatLabel}</td>
                  <td className="px-4 py-3 text-right text-slate-100">{formatNumber(impressions)}</td>
                  <td className="px-4 py-3 text-right text-slate-100">{formatNumber(clicks)}</td>
                  <td className="px-4 py-3 text-right text-slate-100">{`${formatDecimal(ctrRaw, 3)}%`}</td>
                  <td className="px-4 py-3 text-right text-slate-100">{formatDecimal(cpmRaw, 3)}</td>
                  <td className="px-4 py-3 text-right text-slate-100">{formatDecimal(revenue, 3)}</td>
                </tr>
              );
            })}
            {!rows.length && !loading && (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-sm text-slate-400">
                  통계를 불러오면 여기에 표시됩니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {loading && (
        <div className="border-t border-slate-800/70 bg-slate-900/70 px-4 py-3 text-right text-xs text-slate-400">
          통계를 불러오는 중입니다…
        </div>
      )}
    </div>
  );
}
