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
    <div
      className={`group relative flex h-full flex-col overflow-hidden rounded-3xl bg-[#050a19]/85 backdrop-blur transition-all duration-500 ease-out hover:-translate-y-1.5 hover:shadow-[0_25px_60px_rgba(15,23,42,0.55)] ${ringClass} animate-fade-slide`}
    >
      {selectable && (
        <div className="absolute left-4 top-4 z-20">
          <label className="flex items-center gap-2 rounded-md border border-slate-800/70 bg-slate-950/80 px-2 py-1 text-[11px] font-medium text-slate-200 shadow-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-emerald-400"
              onChange={onToggleSelect}
              checked={selected}
            />
            선택
          </label>
        </div>
      )}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/80 shadow-inner shadow-slate-900/40 transition-all duration-500 group-hover:border-indigo-400/50">
        <div className="relative aspect-video w-full">
          {item.preview ? (
            <img
              src={item.preview}
              alt={item.title || item.slug}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full place-items-center text-xs uppercase tracking-[0.3em] text-slate-500">No Preview</div>
          )}
        </div>
        {item._error && (
          <span className="absolute right-3 top-3 rounded-full bg-rose-600/80 px-2 py-0.5 text-[11px] font-semibold text-white shadow-lg">
            메타 오류
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between gap-4 p-5">
        <div className="space-y-3">
          <div className="font-mono text-sm font-semibold tracking-tight text-cyan-200 sm:text-base">
            {item.slug}
          </div>
          {item.title && <div className="text-sm font-medium text-slate-100">{item.title}</div>}
          <UploadTagChips item={item} />
          {item.routePath && (
            <p className="truncate text-[11px] text-slate-400">
              연결 경로: <span className="text-slate-300">{item.routePath}</span>
            </p>
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
  );
}
