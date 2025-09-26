export default function UploadedItemActions({
  item,
  hasToken,
  copied,
  onCopy,
  onEdit,
  onDelete,
}) {
  return (
    <div className="flex items-center gap-2 pt-1">
      {item.routePath && (
        <>
          <a
            href={item.routePath}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-indigo-600 px-3 py-1 text-white hover:bg-indigo-500"
          >
            Open Route
          </a>
          <button
            onClick={() => onCopy(item)}
            className={`rounded-full px-3 py-1 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
              copied
                ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 shadow-lg shadow-emerald-500/30'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {copied ? 'Copied ✨' : 'Copy'}
          </button>
          {copied && <span className="sr-only" aria-live="polite">링크가 복사되었습니다.</span>}
        </>
      )}
      {hasToken && !item._error && (
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="rounded-full bg-gradient-to-r from-emerald-400/30 via-teal-400/25 to-cyan-400/25 px-3 py-1 text-sm font-semibold text-emerald-100 shadow-[0_12px_30px_rgba(16,185,129,0.25)] backdrop-blur transition hover:brightness-115 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200"
        >
          Edit
        </button>
      )}
      <button
        disabled={!hasToken}
        onClick={() => onDelete(item)}
        className="ml-auto rounded-full bg-rose-600 px-3 py-1 hover:bg-rose-500 disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
