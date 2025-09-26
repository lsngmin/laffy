import AnalyticsEmptyState from './AnalyticsEmptyState';
import AnalyticsRow from './AnalyticsRow';

export default function AnalyticsTable({
  rows,
  metricsLoading,
  visibleColumns,
  formatNumber,
  formatPercent,
  onEdit,
}) {
  const headerColumns = [
    { key: 'content', label: '콘텐츠' },
    { key: 'type', label: '타입' },
    visibleColumns.views ? { key: 'views', label: '조회수', align: 'text-right' } : null,
    visibleColumns.likes ? { key: 'likes', label: '좋아요', align: 'text-right' } : null,
    visibleColumns.likeRate ? { key: 'likeRate', label: '좋아요율', align: 'text-right' } : null,
    visibleColumns.link ? { key: 'link', label: '링크', align: 'text-right' } : null,
    visibleColumns.edit ? { key: 'edit', label: '편집', align: 'text-right' } : null,
  ].filter(Boolean);

  const colSpan = headerColumns.length;

  return (
    <div className="overflow-hidden rounded-2xl bg-slate-900/80 ring-1 ring-slate-800/70">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800/70 text-sm">
          <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-widest text-slate-400">
            <tr>
              {headerColumns.map((column) => (
                <th key={column.key} className={`px-4 py-3 font-semibold ${column.align || ''}`}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.map((row) => (
              <AnalyticsRow
                key={row.slug}
                row={row}
                metricsLoading={metricsLoading}
                visibleColumns={visibleColumns}
                formatNumber={formatNumber}
                formatPercent={formatPercent}
                onEdit={onEdit}
              />
            ))}
            {rows.length === 0 && <AnalyticsEmptyState colSpan={colSpan} />}
          </tbody>
        </table>
      </div>
      {metricsLoading && (
        <div className="border-t border-slate-800/70 bg-slate-900/70 px-4 py-3 text-right text-xs text-slate-400">
          메트릭을 불러오는 중입니다…
        </div>
      )}
    </div>
  );
}
