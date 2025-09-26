import clsx from "clsx";

export default function CategoryNavigation({
  items = [],
  activeKey = "",
  onItemClick,
  ariaLabel,
  ...rest
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <nav
      className="relative mx-auto mb-6 max-w-4xl"
      aria-label={ariaLabel || "Category navigation"}
      {...rest}
    >
      <div className="relative rounded-3xl bg-slate-900/70 backdrop-blur-md px-4 py-3 shadow-xl ring-1 ring-white/10">
        <span
          className="pointer-events-none absolute inset-y-0 left-0 w-12 rounded-l-3xl bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute inset-y-0 right-0 w-12 rounded-r-3xl bg-gradient-to-l from-slate-950 via-slate-950/70 to-transparent"
          aria-hidden="true"
        />

        <ul className="flex flex-wrap justify-center gap-3 overflow-x-auto snap-x snap-mandatory text-sm font-medium text-slate-300">
          {items.map((item) => {
            const active = item.key === activeKey;
            return (
              <li key={item.key} className="snap-start">
                <button
                  type="button"
                  onClick={() => onItemClick?.(item)}
                  className={clsx(
                    "inline-flex items-center whitespace-nowrap rounded-full px-5 py-2.5 transition-all duration-300 ease-out",
                    active
                      ? "bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 text-slate-950 shadow-lg shadow-sky-400/20 ring-2 ring-sky-300"
                      : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white hover:scale-105"
                  )}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
