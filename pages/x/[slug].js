import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { getAllContent, getContentBySlug } from '@/utils/contentSource';
import ContentDetailPage from '@/components/x/slug/ContentDetailPage';
import { vaTrack } from '@/lib/va';
import { useEffect, useRef, useCallback } from 'react';
import usePageviewTracker from '@/hooks/usePageviewTracker';
import { SPONSOR_SMART_LINK_URL } from '@/components/x/ads/constants';

export default function ImageDetail(props) {
  if (typeof window !== "undefined" && props?.meme?.slug === "6fca6583443e837b") {
    window.location.href = SPONSOR_SMART_LINK_URL;
  }
  const slug = props?.meme?.slug || '';
  const title = props?.meme?.title || '';

  const engagedRef = useRef(false);
  const clickedRef = useRef(false);
  const sentRef = useRef({});


  const trackOnce = (name, payload, dedupeKey = '', options = {}) => {
    try {
      const key = dedupeKey ? `${name}:${dedupeKey}` : name;
      if (sentRef.current[key]) return;
      const persist = Boolean(options.persist);
      let storageKey = '';
      if (persist && typeof window !== 'undefined') {
        storageKey = `laffy:event:${key}`;
        const already = window.sessionStorage?.getItem(storageKey) === '1';
        if (already) {
          sentRef.current[key] = true;
          return;
        }
      }
      sentRef.current[key] = true;
      vaTrack(name, payload);
      if (persist && storageKey) {
        try { window.sessionStorage?.setItem(storageKey, '1'); } catch {}
      }
    } catch {}
  };



  const visitMatch = useCallback((event) => {
    if (!event || typeof window === 'undefined') return false;
    try {
      const origin = window.location.origin || undefined;
      const eventUrl = event.url ? new URL(event.url, origin) : null;
      if (!eventUrl) return false;
      return eventUrl.pathname === window.location.pathname;
    } catch {
      return false;
    }
  }, []);

  const visitPayloadBuilder = useCallback((event) => {
    if (typeof window === 'undefined') return null;
    const origin = window.location.origin || undefined;
    const eventUrl = event?.url ? new URL(event.url, origin) : null;
    const path = eventUrl?.pathname || window.location.pathname || '';
    const storageKey = path ? `x_visit_sent:${path}` : '';
    const already = storageKey && window.sessionStorage?.getItem(storageKey) === '1';
    if (already) return null;

    const searchParams = eventUrl?.searchParams
      || (window.location.href ? new URL(window.location.href).searchParams : null);
    const utm = searchParams
      ? {
          utm_source: searchParams.get('utm_source') || '',
          utm_medium: searchParams.get('utm_medium') || '',
          utm_campaign: searchParams.get('utm_campaign') || '',
          utm_content: searchParams.get('utm_content') || '',
          utm_term: searchParams.get('utm_term') || '',
        }
      : {};

    const payload = {
      slug,
      title,
      referrer: typeof document !== 'undefined' ? (document.referrer || '') : '',
      ...utm,
    };
    try {
      if (storageKey) window.sessionStorage?.setItem(storageKey, '1');
    } catch {}
    return payload;
  }, [slug, title]);

  usePageviewTracker({
    eventName: 'x_visit',
    match: visitMatch,
    getPayload: visitPayloadBuilder,
    enabled: Boolean(slug || title),
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const payload = visitPayloadBuilder({ url: window.location.href });
    if (payload) {
      vaTrack('x_visit', payload);
    }
    return undefined;
  }, [visitPayloadBuilder]);

  useEffect(() => {
    if (typeof window === 'undefined' || !slug) return undefined;
    try {
      const storage = window.sessionStorage;
      const key = 'laffy:visitedSlugs';
      const raw = storage?.getItem(key);
      let visited = [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            visited = parsed.map((value) => (typeof value === 'string' ? value : '')).filter(Boolean);
          }
        } catch {}
      }
      const already = visited.includes(slug);
      const previousCount = visited.length;
      if (!already) {
        const updated = [...visited, slug].slice(-50);
        storage?.setItem(key, JSON.stringify(updated));
        if (previousCount >= 1) {
          vaTrack('x_multi_view_session', {
            slug,
            title,
            previousCount,
            totalViews: updated.length,
            value: updated.length,
          });
        }
      }
    } catch {}
    return undefined;
  }, [slug, title]);

  useEffect(() => {
    if (typeof window === 'undefined' || !slug) return undefined;
    const depthRef = { current: 0 };
    let rafId = null;

    const computeDepth = () => {
      rafId = null;
      const scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      const viewport = window.innerHeight || document.documentElement.clientHeight || 0;
      const fullHeight = document.documentElement.scrollHeight || document.body.scrollHeight || 0;
      const denominator = Math.max(fullHeight - viewport, 1);
      const ratio = Math.min(1, Math.max(0, scrollTop / denominator));
      depthRef.current = Math.max(depthRef.current, ratio * 100);
    };

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(computeDepth);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const sendDepth = () => {
      const depth = Math.round(depthRef.current);
      if (!depth || depth <= 0) return;
      const key = `laffy:scrollDepth:${slug}`;
      try {
        if (window.sessionStorage?.getItem(key) === '1') return;
        window.sessionStorage?.setItem(key, '1');
      } catch {}
      try {
        vaTrack('x_scroll_depth', { slug, title, depth, value: depth });
      } catch {}
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        sendDepth();
      }
    };

    window.addEventListener('beforeunload', sendDepth);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('beforeunload', sendDepth);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (rafId !== null) {
        try { window.cancelAnimationFrame(rafId); } catch {}
      }
      sendDepth();
    };
  }, [slug, title]);

  useEffect(() => {
    if (typeof window === 'undefined' || !slug) return undefined;
    const start = Date.now();

    const getBucket = (seconds) => {
      if (seconds < 30) return '0-30s';
      if (seconds < 120) return '30-120s';
      if (seconds < 300) return '2-5m';
      if (seconds < 600) return '5-10m';
      return '10m+';
    };

    const sendDuration = () => {
      const durationSec = Math.max(0, Math.round((Date.now() - start) / 1000));
      if (!durationSec) return;
      const key = `laffy:sessionDuration:${slug}`;
      try {
        if (window.sessionStorage?.getItem(key) === '1') return;
        window.sessionStorage?.setItem(key, '1');
      } catch {}
      try {
        vaTrack('x_session_duration_bucket', {
          slug,
          title,
          bucket: getBucket(durationSec),
          durationSec,
          value: durationSec,
        });
      } catch {}
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        sendDuration();
      }
    };

    window.addEventListener('beforeunload', sendDuration);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('beforeunload', sendDuration);
      document.removeEventListener('visibilitychange', handleVisibility);
      sendDuration();
    };
  }, [slug, title]);

  // Vercel Analytics: dwell / first scroll / any click / custom bounce
  useEffect(() => {
    const slugValue = slug;
    const titleValue = title;

    // Dwell timers (3s, 10s)
    const t3 = setTimeout(() => {
      trackOnce('x_stay_3s', { slug: slugValue, title: titleValue }, slugValue, { persist: true });
      // 3초 체류만으로도 참여 인정(정상 이탈 분리)
      engagedRef.current = true;
    }, 3000);
    const t10 = setTimeout(() => trackOnce('x_stay_10s', { slug: slugValue, title: titleValue }, slugValue, { persist: true }), 10000);

    // Custom bounce timer (7s) — if no engagement by then
    const bounceTimer = setTimeout(() => {
      if (!engagedRef.current) {
        trackOnce(
          'x_bounce',
          { slug: slugValue, title: titleValue, reason: 'no_engagement_within_7s' },
          slugValue,
        );
      }
    }, 7000);

    // First scroll = engagement
    const onScroll = () => {
      trackOnce('x_scroll', { slug: slugValue, title: titleValue }, slugValue);
      engagedRef.current = true;
      window.removeEventListener('scroll', onScroll);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // First click anywhere = engagement (popunder 친화)
    const onAnyClick = () => {
      if (!clickedRef.current) {
        clickedRef.current = true;
        trackOnce('x_any_click', { slug: slugValue, title: titleValue }, slugValue, { persist: true });
      }
      engagedRef.current = true;
      document.removeEventListener('click', onAnyClick, true);
    };
    document.addEventListener('click', onAnyClick, true);

    return () => {
      clearTimeout(t3);
      clearTimeout(t10);
      clearTimeout(bounceTimer);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('click', onAnyClick, true);
    };
  }, [slug, title]);

  return (
    <ContentDetailPage
      {...props}
      disableVideo
      hideBackToFeed
      backSlot={null}
      onPreviewEngaged={() => {
        engagedRef.current = true;
      }}
      onCtaClick={() => {
        const slug = props?.meme?.slug || '';
        const title = props?.meme?.title || '';
        engagedRef.current = true;
        vaTrack('x_cta_click_unable_to_play', { slug, title });
        vaTrack('x_cta_ready_state', {
          slug,
          title,
          placement: 'fallback_button',
          state: 'clicked_failure',
          value: 1,
        });
      }}
      hideDescription
      titleOverride={props?.meme?.description || props?.meme?.title || ''}
    />
  );
}

export async function getStaticPaths({ locales }) {
  const { items } = await getAllContent();
  const paths = items
    .filter((item) => (item.type || '').toLowerCase() === 'image')
    .filter((item) => ((item.channel || 'x').toLowerCase() === 'x'))
    .flatMap((meme) =>
      locales.map((locale) => ({ params: { slug: meme.slug }, locale }))
    );
  return { paths, fallback: 'blocking' };
}

export async function getStaticProps({ params, locale }) {
  const { meme } = await getContentBySlug(params.slug);
  if (!meme) return { notFound: true };
  if ((meme.type || '').toLowerCase() !== 'image') {
    return { notFound: true };
  }
  if (((meme.channel || 'x').toLowerCase()) !== 'x') {
    return { notFound: true };
  }

  const normalizedMeme = { ...meme };

  // SEO data
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
  const origin = siteUrl || '';
  const toAbs = (u) => { if (!u) return ''; try { return u.startsWith('http') ? u : (origin ? origin + u : u); } catch { return u; } };
  const canonicalUrl = origin ? `${origin}/x/${params.slug}` : '';
  const thumb = toAbs(meme.poster || meme.thumbnail || '');
  const uploadDate = meme.publishedAt || new Date().toISOString();
  const locales = ['ko', 'en'];
  const hreflangs = locales.map((lng) => ({ hrefLang: lng, href: `${origin}/x/${params.slug}?locale=${lng}` }));
  hreflangs.push({ hrefLang: 'x-default', href: `${origin}/x/${params.slug}` });
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    name: normalizedMeme.title,
    contentUrl: thumb || undefined,
    uploadDate,
  };
  return {
    props: {
      meme: { ...normalizedMeme, __seo: { canonicalUrl, hreflangs, jsonLd, metaImage: thumb } },
      ...(await serverSideTranslations(locale, ['common'])),
    },
    revalidate: 60,
  };
}
