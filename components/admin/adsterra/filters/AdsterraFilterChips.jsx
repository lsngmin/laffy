export default function AdsterraFilterChips({ filters, onClear }) {
  const entries = Object.entries(filters).filter(([, value]) => value);
  if (!entries.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {entries.map(([key, value]) => (
        <button
          key={key}
          type="button"
          onClick={() => onClear(key)}
          className="inline-flex items-center gap-2 rounded-full bg-slate-800/90 px-3 py-1 text-xs text-slate-100 transition hover:bg-slate-700"
        >
          <span className="uppercase tracking-widest text-slate-400">{key}</span>
          <span className="font-semibold text-slate-100">{value}</span>
          <span aria-hidden>✕</span>
        </button>
      ))}
      <button
        type="button"
        onClick={() => onClear('all')}
        className="inline-flex items-center rounded-full border border-slate-600/60 px-3 py-1 text-xs text-slate-200 transition hover:bg-slate-800/60"
      >
        필터 초기화
      </button>
    </div>
  );
}
