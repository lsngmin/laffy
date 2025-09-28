export default function AnalyticsRow({
  row,
  metrics,
  metricsLoading,
  formatNumber,
  formatPercent,
  onEdit,
  visibleColumns,
  selected,
  onToggleSelect,
}) {
  const viewsDisplay = metrics ? formatNumber(metrics.views) : metricsLoading ? '불러오는 중…' : '—';
  const likesDisplay = metrics ? formatNumber(metrics.likes) : metricsLoading ? '불러오는 중…' : '—';
  const likeRateDisplay = metrics && metrics.views > 0 ? formatPercent(metrics.likes / metrics.views) : '—';

  return (
    <tr className={`transition hover:bg-slate-800/40 ${selected ? 'bg-slate-800/30' : ''}`}>
      <td className="px-4 py-3">
        <input
          type="checkbox"
          className="accent-emerald-400"
          checked={selected}
          onChange={() => onToggleSelect(row.slug)}
          aria-label={`${row.title || row.slug} 선택`}
        />
      </td>
      <td className="px-4 py-3">
        <div className="font-semibold text-slate-100">{row.title || row.slug}</div>
        <div className="text-xs text-slate-500">{row.slug}</div>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex rounded-full bg-slate-800 px-2 py-0.5 text-[11px] uppercase tracking-widest text-slate-300">
          {row.type || 'unknown'}
        </span>
      </td>
      {visibleColumns.views && (
        <td className="px-4 py-3 text-right text-slate-100">{viewsDisplay}</td>
      )}
      {visibleColumns.likes && (
        <td className="px-4 py-3 text-right text-slate-100">{likesDisplay}</td>
      )}
      {visibleColumns.likeRate && (
        <td className="px-4 py-3 text-right text-slate-100">{likeRateDisplay}</td>
      )}
      {visibleColumns.route && (
        <td className="px-4 py-3 text-right">
          {row.routePath ? (
            <a
              href={row.routePath}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-sky-300 hover:text-sky-200"
            >
              열기
            </a>
          ) : (
            <span className="text-xs text-slate-500">—</span>
          )}
        </td>
      )}
      {visibleColumns.edit && (
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            onClick={() => onEdit(row)}
            className="inline-flex items-center justify-center rounded-full border border-slate-600/60 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            수정
          </button>
        </td>
      )}
    </tr>
  );
}
