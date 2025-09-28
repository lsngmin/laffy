export default function UploadTagChips({ item }) {
  const tags = [];
  if (item.channel) tags.push({ label: item.channel.toUpperCase(), tone: 'bg-purple-900/60' });
  if (item.publishedAt) tags.push({ label: item.publishedAt.slice(0, 10), tone: 'bg-slate-800/80' });

  if (!tags.length) return null;

  return (
    <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
      {tags.map((tag) => (
        <span
          key={`${tag.label}-${tag.tone}`}
          className={`rounded-full px-2 py-0.5 uppercase tracking-wide text-slate-200 ${tag.tone}`}
        >
          {tag.label}
        </span>
      ))}
    </div>
  );
}
