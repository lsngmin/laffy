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
    ? 'ring-1 ring-rose-500/60'
    : selected
      ? 'ring-2 ring-emerald-400/80'
      : 'ring-1 ring-slate-800/70';

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-slate-900/80 ${ringClass}`}>
      {selectable && (
        <label className="absolute left-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 shadow-lg">
          <input
            type="checkbox"
            className="h-4 w-4 accent-emerald-400"
            onChange={onToggleSelect}
            checked={selected}
          />
          <span className="sr-only">콘텐츠 선택</span>
        </label>
      )}
      <div className="relative aspect-video w-full bg-slate-950/60">
        {item.preview ? (
          <img src={item.preview} alt={item.title || item.slug} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-xs text-slate-400">No preview</div>
        )}
        {item.type && (
          <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold uppercase text-white">
            {item.type}
          </span>
        )}
        {item._error && (
          <span className="absolute right-3 top-3 rounded-full bg-rose-600/80 px-2 py-0.5 text-[11px] font-semibold text-white shadow-lg">
            메타 오류
          </span>
        )}
      </div>
      <div className="space-y-2 p-3 text-sm">
        <div className="truncate font-semibold text-slate-100">{item.title || item.slug}</div>
        <div className="truncate text-[12px] text-slate-400">{item.slug}</div>
        {item.description && (
          <p className="line-clamp-2 text-[12px] leading-relaxed text-slate-400/85">{item.description}</p>
        )}
        <UploadTagChips item={item} />
        {item._error && (
          <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
            메타 데이터를 불러오지 못했어요. JSON 파일을 확인해 주세요.
          </p>
        )}
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
