import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { getAllContent, getContentBySlug } from '@/utils/contentSource';
import MemeDetailPage from '@/components/m/MemeDetailPage';
import dynamic from 'next/dynamic';
import QuadAdGrid from '@/components/ads/QuadAdGrid';
const MonetagInvoke = dynamic(() => import('@/components/ads/MonetagInvokeContainer'), { ssr: false });
import * as g from '@/lib/gtag';
import { vaTrack } from '@/lib/va';
import { useEffect, useRef, useCallback } from 'react';
import usePageviewTracker from '@/hooks/usePageviewTracker';

const BannerTop = dynamic(() => import('@/components/ads/RelishBannerInvoke'), { ssr: false });
const BannerRect = dynamic(() => import('@/components/ads/RelishAtOptionsFrame'), { ssr: false });

export default function ImageDetail(props) {
  if (typeof window !== "undefined" && props?.meme?.slug === "6fca6583443e837b") {
    window.location.href = "https://relishsubsequentlytank.com/m4dat49uw?key=5c0b078a04533db894c7b305e5dd7a67";
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
    <MemeDetailPage
      {...props}
      disableVideo
      hideBackToFeed
      backSlot={null}
      showRecommended={false}
      recommendSlot={
        <div className="mt-10 flex justify-center">
          <BannerRect width={300} height={250} />
        </div>
      }
      belowVideoSlot={null}
      afterArticleSlot={
        <div className="mt-6 flex w-full justify-center">
          <MonetagInvoke
            containerId="container-423e3c0edc8f597be9c7991231d2dd57"
            src="//relishsubsequentlytank.com/423e3c0edc8f597be9c7991231d2dd57/invoke.js"
          />
        </div>
      }
      onPreviewClick={() => {
        const slug = props?.meme?.slug || '';
        const title = props?.meme?.title || '';
        engagedRef.current = true;
        vaTrack('x_overlay_click', { slug, title });
        try {
          g.event('video_overlay_click', {
            route: 'x',
            action_type: 'sponsored',
            slug: props?.meme?.slug || '',
            title: props?.meme?.title || '',
            placement: 'overlay',
          });
        } catch {}
        try { window.open('https://otieu.com/4/9924601', '_blank', 'noopener'); } catch {}
      }}
      onCtaClick={() => {
        const slug = props?.meme?.slug || '';
        const title = props?.meme?.title || '';
        engagedRef.current = true;
        vaTrack('x_cta_click_unable_to_play', { slug, title });
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
    .flatMap((meme) =>
      locales.map((locale) => ({ params: { slug: meme.slug }, locale }))
    );
  return { paths, fallback: 'blocking' };
}

export async function getStaticProps({ params, locale }) {
  const { meme, items } = await getContentBySlug(params.slug);
  if (!meme) return { notFound: true };
  if ((meme.type || '').toLowerCase() !== 'image') {
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
      allMemes: items,
      ...(await serverSideTranslations(locale, ['common'])),
    },
    revalidate: 60,
  };
}
