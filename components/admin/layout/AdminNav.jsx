export default function AdminNav({ items, activeView, onChange }) {
  return (
    <nav className="rounded-full bg-slate-900/60 p-1 shadow-inner shadow-black/40">
      <div className="flex flex-wrap items-center justify-center gap-1">
        {items.map((item) => {
          const active = activeView === item.key;
          const disabled = item.disabled;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                if (!disabled) onChange(item.key);
              }}
              disabled={disabled}
              aria-pressed={active}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${
                active
                  ? 'bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-100'
              } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
