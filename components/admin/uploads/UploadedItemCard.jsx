import UploadTagChips from './UploadTagChips';
import UploadedItemActions from './UploadedItemActions';

export default function UploadedItemCard({
  item,
  hasToken,
  copiedSlug,
  onCopy,
  onEdit,
  onDelete,
  selectable = false,
  selected = false,
  onToggleSelect = () => {},
}) {
  const copied = copiedSlug === item.slug;
  const ringClass = item._error
    ? 'border border-rose-500/60 shadow-[0_0_24px_rgba(244,63,94,0.25)]'
    : selected
      ? 'border border-emerald-400/70 shadow-[0_0_28px_rgba(16,185,129,0.25)]'
      : 'border border-slate-800/60';

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-[#050a19]/85 backdrop-blur ${ringClass}`}>
      {selectable && (
        <label className="absolute left-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 shadow-lg">
          <input
            type="checkbox"
            className="h-4 w-4 accent-emerald-400"
            onChange={onToggleSelect}
            checked={selected}
          />
          <span className="sr-only">콘텐츠 선택</span>
        </label>
      )}
      <div className="grid gap-4 p-4 sm:grid-cols-[140px,1fr]">
        <div className="relative overflow-hidden rounded-2xl border border-slate-900/60 bg-slate-950/70">
          {item.preview ? (
            <img src={item.preview} alt={item.title || item.slug} className="h-36 w-full object-cover" />
          ) : (
            <div className="grid h-36 place-items-center text-xs uppercase tracking-[0.3em] text-slate-500">No Preview</div>
          )}
          {item._error && (
            <span className="absolute right-3 top-3 rounded-full bg-rose-600/80 px-2 py-0.5 text-[11px] font-semibold text-white shadow-lg">
              메타 오류
            </span>
          )}
        </div>
        <div className="flex flex-col justify-between gap-3">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-100">
              {item.title || item.slug}
            </div>
            <div className="text-[12px] text-slate-400">
              <span className="rounded bg-slate-900/70 px-2 py-0.5 font-mono text-[11px] tracking-wide text-slate-300">
                {item.slug}
              </span>
            </div>
            <UploadTagChips item={item} />
            {item.routePath && (
              <p className="truncate text-[11px] text-slate-500">{item.routePath}</p>
            )}
            {item._error && (
              <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
                메타 데이터를 불러오지 못했어요. JSON 파일을 확인해 주세요.
              </p>
            )}
          </div>
          <UploadedItemActions
            item={item}
            hasToken={hasToken}
            copied={copied}
            onCopy={onCopy}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      </div>
    </div>
  );
}
