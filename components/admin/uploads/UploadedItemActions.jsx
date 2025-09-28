export default function UploadedItemActions({
  item,
  hasToken,
  copied,
  onCopy,
  onEdit,
  onDelete,
}) {
  const canCopy = Boolean(item?.routePath);
  const handleCopy = () => {
    if (!canCopy) return;
    onCopy(item);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <button
        type="button"
        onClick={handleCopy}
        disabled={!canCopy}
        className={`group relative overflow-hidden rounded-xl border px-4 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 ${
          copied
            ? 'border-emerald-400/70 text-emerald-100'
            : 'border-slate-700/70 text-slate-200 hover:border-sky-400/60 hover:text-white'
        } ${canCopy ? '' : 'cursor-not-allowed opacity-50'}`}
      >
        <span
          className={`absolute inset-0 -z-10 bg-gradient-to-r from-emerald-400/20 via-teal-400/15 to-cyan-400/25 transition ${
            copied ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          aria-hidden="true"
        />
        <span className="relative z-10">{copied ? '링크 복사 완료' : '링크 복사'}</span>
      </button>
      {copied && <span className="sr-only" aria-live="polite">링크가 복사되었습니다.</span>}
      {hasToken && !item._error && (
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="group relative overflow-hidden rounded-xl border border-emerald-400/40 px-4 py-1.5 text-sm font-semibold text-emerald-100 shadow-[0_12px_30px_rgba(16,185,129,0.2)] transition hover:border-emerald-300/70 hover:text-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200"
        >
          <span className="absolute inset-0 -z-10 bg-gradient-to-r from-emerald-400/20 via-teal-400/15 to-cyan-400/20 opacity-70 group-hover:opacity-100" aria-hidden="true" />
          <span className="relative z-10">메타 수정</span>
        </button>
      )}
      <button
        type="button"
        disabled={!hasToken}
        onClick={() => onDelete(item)}
        className="group relative ml-auto overflow-hidden rounded-xl border border-rose-500/60 px-4 py-1.5 text-sm font-semibold text-rose-100 transition hover:border-rose-400/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200 disabled:cursor-not-allowed disabled:border-rose-900 disabled:text-rose-400"
      >
        <span className="absolute inset-0 -z-10 bg-gradient-to-r from-rose-500/30 via-amber-500/20 to-rose-400/30 opacity-70 group-hover:opacity-100" aria-hidden="true" />
        <span className="relative z-10">삭제</span>
      </button>
    </div>
  );
}
