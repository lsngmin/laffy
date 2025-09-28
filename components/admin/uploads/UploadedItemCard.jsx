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
    ? 'border border-rose-500/60 shadow-[0_0_36px_rgba(244,63,94,0.28)]'
    : selected
      ? 'border border-emerald-400/80 shadow-[0_0_36px_rgba(16,185,129,0.32)]'
      : 'border border-slate-800/70 shadow-[0_0_55px_rgba(14,23,42,0.55)]';

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.92),_rgba(5,10,25,0.92))] backdrop-blur ${ringClass}`}
    >
      {selectable && (
        <div className="absolute left-5 top-5 z-20 flex items-center gap-2 rounded-lg bg-slate-950/75 px-3 py-1.5 text-[11px] font-medium text-slate-200">
          <input
            type="checkbox"
            className="h-4 w-4 accent-emerald-400"
            onChange={onToggleSelect}
            checked={selected}
          />
          선택
        </div>
      )}
      <div className="grid gap-5 p-6 lg:grid-cols-[minmax(280px,340px)_1fr]">
        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-slate-900/70 bg-slate-950/70">
          {item.preview ? (
            <img
              src={item.preview}
              alt={item.title || item.slug}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-xs uppercase tracking-[0.3em] text-slate-500">
              No Preview
            </div>
          )}
          {item._error && (
            <span className="absolute right-3 top-3 rounded-full bg-rose-600/80 px-2 py-0.5 text-[11px] font-semibold text-white shadow-lg">
              메타 오류
            </span>
          )}
        </div>
        <div className="flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <div className="inline-flex max-w-full items-center gap-2">
                <span className="inline-flex max-w-full items-center gap-2 truncate rounded-xl border border-cyan-400/50 bg-cyan-500/10 px-3 py-1 font-mono text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200 shadow-[0_18px_50px_-30px_rgba(34,211,238,0.75)]">
                  {item.slug}
                </span>
              </div>
              {item.title && (
                <div className="truncate text-base font-semibold text-slate-50/90">
                  {item.title}
                </div>
              )}
            </div>
            <UploadTagChips item={item} />
            {item.routePath && (
              <p className="truncate text-xs text-slate-400">
                연결 경로 <span className="text-slate-200">{item.routePath}</span>
              </p>
            )}
            {item._error && (
              <p className="rounded-xl bg-rose-500/15 px-3 py-2 text-[12px] text-rose-200">
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
