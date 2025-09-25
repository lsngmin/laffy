import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { BookmarkIcon, HeartIcon, ShareIcon } from './icons';
import { getDetailHref } from '../lib/paths';
import { vaTrack } from '../lib/va';

export default function MemeCard({
  meme,
  href,
  isLiked,
  onToggleLike,
  likesDisplay,
  viewsDisplay,
  isFavorite,
  onToggleFavorite
}) {
  const { t } = useTranslation('common');
  const [likePulse, setLikePulse] = useState(false);
  const [favoritePulse, setFavoritePulse] = useState(false);
  const hasThumbnail = Boolean(meme.thumbnail);
  useEffect(() => {
    if (!likePulse) return undefined;
    const timer = setTimeout(() => setLikePulse(false), 320);
    return () => clearTimeout(timer);
  }, [likePulse]);

  useEffect(() => {
    if (!favoritePulse) return undefined;
    const timer = setTimeout(() => setFavoritePulse(false), 320);
    return () => clearTimeout(timer);
  }, [favoritePulse]);

  const trackInteraction = useCallback(
    (eventName, extra = {}) => {
      try {
        vaTrack(eventName, {
          slug: meme.slug,
          title: meme.title,
          type: meme.type,
          location: 'feed_card',
          ...extra,
        });
      } catch {}
    },
    [meme.slug, meme.title, meme.type]
  );

  const handleLike = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      const nextState = !isLiked;
      trackInteraction('feed_like_toggle', {
        status: nextState ? 'liked' : 'unliked',
      });
      onToggleLike?.(meme.slug);
      setLikePulse(true);
    },
    [isLiked, meme.slug, onToggleLike, trackInteraction]
  );

  const handleFavorite = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      const nextState = !isFavorite;
      trackInteraction('feed_bookmark_toggle', {
        status: nextState ? 'bookmarked' : 'unbookmarked',
      });
      onToggleFavorite?.(meme.slug);
      setFavoritePulse(true);
    },
    [isFavorite, meme.slug, onToggleFavorite, trackInteraction]
  );

  const handleShare = useCallback(
    async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof window === 'undefined') return;
      const detailPath = getDetailHref(meme);
      const targetUrl = `${window.location.origin}${detailPath}`;
      const sharePayload = {
        title: meme.title,
        url: targetUrl
      };
      const hasShareApi = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
      trackInteraction('feed_share_click', {
        method: hasShareApi ? 'web_share_api' : 'twitter_intent',
      });
      if (navigator.share) {
        try {
          await navigator.share(sharePayload);
          return;
        } catch (error) {
          if (error?.name === 'AbortError') return;
          console.warn('Share dismissed', error);
        }
      }
      const text = encodeURIComponent(meme.title);
      const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(targetUrl)}&text=${text}`;
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    },
    [meme.slug, meme.title]
  );

  return (
    <Link href={href} className="group relative block">
      <article className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500/25 via-purple-500/20 to-pink-500/25 p-[1px] shadow-[0_30px_60px_-35px_rgba(79,70,229,0.65)] transition-transform duration-500 active:scale-[0.99] sm:p-[1.5px]">
        <div className="relative flex h-full flex-col gap-4 rounded-[1.05rem] bg-slate-950/75 p-4 sm:p-5">
          <div className={`relative overflow-hidden rounded-xl ${meme.mediaAspect || 'aspect-video'} bg-slate-900/40 shadow-[0_18px_26px_-24px_rgba(148,163,184,0.65)]`}>
            {hasThumbnail ? (
              <img
                src={meme.thumbnail}
                alt={meme.title}
                className="h-full w-full object-cover transition-transform duration-500 group-active:scale-[1.02]"
                loading="lazy"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,_#6366f1_0%,_#0f172a_65%)] text-sm font-semibold text-slate-100"
              >
                미리보기가 준비되지 않았어요
              </div>
            )}
            {meme.durationLabel && meme.type !== 'twitter' && (
              <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-slate-900/75 px-2 py-0.5 text-[11px] font-mono uppercase tracking-wide text-white">
                {meme.durationLabel}
              </div>
            )}
            <div className="pointer-events-none absolute right-3 top-3 rounded-full border border-white/20 bg-gradient-to-r from-indigo-500/70 via-purple-500/50 to-pink-500/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-[0_8px_20px_rgba(99,102,241,0.45)]">
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                {t('meta.viewsLabel')}
                <span className="text-xs font-bold text-white/90">{meme.viewsDisplay}</span>
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold leading-snug text-white sm:text-xl">{meme.title}</h2>
            <p className="text-sm leading-relaxed text-slate-200/80 sm:text-[15px]">{meme.description}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-300/90">
              {meme.relativeTime && <span>{meme.relativeTime}</span>}
              {meme.relativeTime && likesDisplay && <span className="text-slate-500">•</span>}
              {likesDisplay && (
                <span className="inline-flex items-center gap-1 text-rose-200">
                  <HeartIcon className="h-3.5 w-3.5" />
                  {likesDisplay}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLike}
                className={`action-button bg-slate-900/60 ${isLiked ? 'bg-rose-500/20 text-rose-300' : 'text-slate-200/80'} ${
                  likePulse ? 'bounce-once' : ''
                }`}
                aria-pressed={isLiked}
                aria-label={isLiked ? t('actions.liked') : t('actions.like')}
              >
                <HeartIcon filled={isLiked} className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleFavorite}
                className={`action-button bg-slate-900/60 ${isFavorite ? 'bg-amber-400/20 text-amber-200' : 'text-slate-200/80'} ${
                  favoritePulse ? 'bounce-once' : ''
                }`}
                aria-pressed={isFavorite}
                aria-label={isFavorite ? t('favorites.saved') : t('favorites.save')}
              >
                <BookmarkIcon className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleShare}
              className="action-button bg-slate-900/60 text-slate-200/80"
              aria-label={t('actions.share')}
            >
              <ShareIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        <style jsx>{`
          .action-button {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            border-radius: 9999px;
            padding: 0.55rem 0.85rem;
            font-weight: 600;
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.28);
            transition: transform 0.25s ease, background-color 0.3s ease, color 0.3s ease;
          }
          .action-button:active {
            transform: scale(0.94);
          }
          @keyframes bounceSoft {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.12);
            }
          }
          .bounce-once {
            animation: bounceSoft 0.32s ease-in-out;
          }
        `}</style>
      </article>
    </Link>
  );
}
