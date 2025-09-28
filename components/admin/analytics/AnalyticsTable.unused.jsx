import { useEffect, useMemo, useRef } from 'react';
import AnalyticsEmptyState from './AnalyticsEmptyState.unused';
import AnalyticsRow from './AnalyticsRow.unused';

export default function AnalyticsTable({
  rows,
  metricsLoading,
  metricsError,
  formatNumber,
  formatPercent,
  onEdit,
  visibleColumns,
  selectedSlugs,
  onToggleRow,
  onToggleAll,
}) {
  const headerCheckboxRef = useRef(null);
  const selectableSlugs = useMemo(() => rows.map((row) => row.slug).filter(Boolean), [rows]);
  const selectedSet = useMemo(() => new Set(selectedSlugs), [selectedSlugs]);
  const selectedCount = useMemo(
    () => selectableSlugs.filter((slug) => selectedSet.has(slug)).length,
    [selectableSlugs, selectedSet]
  );
  const allSelected = selectableSlugs.length > 0 && selectedCount === selectableSlugs.length;
  const isIndeterminate = selectedCount > 0 && !allSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  return (
    <div className="overflow-hidden rounded-2xl bg-slate-900/80 ring-1 ring-slate-800/70">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800/70 text-sm">
          <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-widest text-slate-400">
            <tr>
              <th className="px-4 py-3">
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  className="accent-emerald-400"
                  checked={allSelected}
                  onChange={() => onToggleAll(!allSelected)}
                  aria-label="모든 항목 선택"
                />
              </th>
              <th className="px-4 py-3 font-semibold">콘텐츠</th>
              <th className="px-4 py-3 font-semibold">타입</th>
              {visibleColumns.views && <th className="px-4 py-3 text-right font-semibold">조회수</th>}
              {visibleColumns.likes && <th className="px-4 py-3 text-right font-semibold">좋아요</th>}
              {visibleColumns.likeRate && <th className="px-4 py-3 text-right font-semibold">좋아요율</th>}
              {visibleColumns.route && <th className="px-4 py-3 text-right font-semibold">링크</th>}
              {visibleColumns.edit && <th className="px-4 py-3 text-right font-semibold">편집</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.map((row) => (
              <AnalyticsRow
                key={row.slug}
                row={row}
                metrics={row.displayMetrics || row.metrics}
                metricsLoading={metricsLoading}
                formatNumber={formatNumber}
                formatPercent={formatPercent}
                onEdit={onEdit}
                visibleColumns={visibleColumns}
                selected={selectedSet.has(row.slug)}
                onToggleSelect={onToggleRow}
              />
            ))}
            {!rows.length && <AnalyticsEmptyState />}
          </tbody>
        </table>
      </div>
      {metricsLoading && (
        <div className="border-t border-slate-800/70 bg-slate-900/70 px-4 py-3 text-right text-xs text-slate-400">
          메트릭을 불러오는 중입니다…
        </div>
      )}
      {metricsError && (
        <div className="border-t border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{metricsError}</div>
      )}
    </div>
  );
}
