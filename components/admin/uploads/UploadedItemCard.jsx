import UploadTagChips from './UploadTagChips';
import UploadedItemActions from './UploadedItemActions';

export default function UploadedItemCard({
  item,
  hasToken,
  copiedSlug,
  onCopy,
  onEdit,
  onDelete,
}) {
  const copied = copiedSlug === item.slug;
  return (
    <div className="overflow-hidden rounded-2xl bg-slate-900/80 ring-1 ring-slate-800/70">
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
      </div>
      <div className="space-y-2 p-3 text-sm">
        <div className="truncate font-semibold text-slate-100">{item.title || item.slug}</div>
        <div className="truncate text-[12px] text-slate-400">{item.slug}</div>
        {item.description && (
          <p className="line-clamp-2 text-[12px] leading-relaxed text-slate-400/85">{item.description}</p>
        )}
        <UploadTagChips item={item} />
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
