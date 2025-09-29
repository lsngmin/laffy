import { useMemo } from 'react';

function formatDuration(seconds) {
  const numeric = Number(seconds);
  if (!Number.isFinite(numeric) || numeric <= 0) return '';
  const totalSeconds = Math.round(numeric);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function VideoPreviewCard({ item, onRedirect, redirecting, ctaLabel, redirectingLabel }) {
  if (!item) return null;

  const {
    slug = '',
    title = '',
    description = '',
    poster,
    thumbnail,
    preview,
    src,
    durationSeconds,
  } = item;

  const mediaPoster = useMemo(() => {
    const candidates = [poster, thumbnail, preview];
    return candidates.find((value) => typeof value === 'string' && value.trim().length > 0) || '';
  }, [poster, preview, thumbnail]);

  const mediaSource = useMemo(() => {
    if (typeof src === 'string' && src.trim().length > 0) return src;
    return '';
  }, [src]);

  const formattedDuration = useMemo(() => formatDuration(durationSeconds), [durationSeconds]);

  return (
    <button
      type="button"
      onClick={() => onRedirect?.(item)}
      className="group flex w-full flex-col overflow-hidden rounded-2xl bg-slate-900/70 ring-1 ring-slate-800/60 transition hover:-translate-y-1 hover:ring-sky-400/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
    >
      <div className="relative w-full overflow-hidden bg-slate-950/60">
        {mediaSource ? (
          <video
            key={mediaSource}
            src={mediaSource}
            poster={mediaPoster || undefined}
            preload="metadata"
            playsInline
            muted
            loop
            className="aspect-video w-full object-cover transition duration-300 group-hover:brightness-110"
          />
        ) : mediaPoster ? (
          <img
            src={mediaPoster}
            alt={title || slug || 'Video preview'}
            className="aspect-video w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="aspect-video grid w-full place-items-center bg-[radial-gradient(circle_at_center,_#38bdf8_0%,_#0f172a_70%)] text-xs font-semibold uppercase tracking-[0.3em] text-slate-900">
            PREVIEW
          </div>
        )}
        {formattedDuration && (
          <span className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
            {formattedDuration}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4 text-slate-200">
        <h2 className="text-base font-semibold leading-snug text-white line-clamp-2">{title || slug}</h2>
        {description ? (
          <p className="text-sm text-slate-400 line-clamp-2">{description}</p>
        ) : null}
        <span className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-slate-800/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-200 transition group-hover:bg-sky-500/70 group-hover:text-slate-950">
          {redirecting ? redirectingLabel : ctaLabel}
        </span>
      </div>
    </button>
  );
}
