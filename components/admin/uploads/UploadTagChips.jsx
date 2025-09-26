export default function UploadTagChips({ item }) {
  const tags = [];
  if (item.type) tags.push(item.type);
  if (item.orientation) tags.push(item.orientation);
  if (Number.isFinite(item.durationSeconds) && item.durationSeconds > 0) {
    tags.push(`${item.durationSeconds}s`);
  }
  if (item.publishedAt) {
    tags.push('published');
  }
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {tags.map((tag) => (
        <span
          key={`${item.slug}-${tag}`}
          className="inline-flex items-center rounded-full bg-slate-800/80 px-2.5 py-0.5 text-[11px] uppercase tracking-widest text-slate-200"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
