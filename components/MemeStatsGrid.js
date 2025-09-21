export default function MemeStatsGrid({ items = [], className = '' }) {
  const visibleItems = items.filter((item) => item && item.value);

  if (!visibleItems.length) {
    return null;
  }

  return (
    <div className={`mt-3 rounded-2xl bg-slate-900/40 px-3 py-3 sm:px-4 ${className}`}>
      <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
        {visibleItems.map(({ key, icon, label, value, datetime }) => (
          <div key={key} className="flex items-start gap-2">
            <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-700/60 text-sm text-slate-100">
              {icon}
            </span>
            <div className="flex flex-col text-left leading-tight">
              <span className="text-[11px] uppercase tracking-wide text-slate-500">
                {label}
              </span>
              {datetime ? (
                <time dateTime={datetime} className="text-sm font-semibold text-slate-100">
                  {value}
                </time>
              ) : (
                <span className="text-sm font-semibold text-slate-100">{value}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
