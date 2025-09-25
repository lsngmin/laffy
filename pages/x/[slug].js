import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { getAllContent, getContentBySlug } from '@/utils/contentSource';
import MemeDetailPage from '@/components/m/MemeDetailPage';
import dynamic from 'next/dynamic';
import QuadAdGrid from '@/components/ads/QuadAdGrid';
const MonetagInvoke = dynamic(() => import('@/components/ads/MonetagInvokeContainer'), { ssr: false });
import * as g from '@/lib/gtag';
import { vaTrack } from '@/lib/va';
import { useEffect, useRef, useLayoutEffect } from 'react';

const BannerTop = dynamic(() => import('@/components/ads/RelishBannerInvoke'), { ssr: false });
const BannerRect = dynamic(() => import('@/components/ads/RelishAtOptionsFrame'), { ssr: false });

export default function ImageDetail(props) {
  const engagedRef = useRef(false);
  const clickedRef = useRef(false);
  const sentRef = useRef({});

  const trackOnce = (name, payload) => {
    try {
      if (sentRef.current[name]) return;
      sentRef.current[name] = true;
      vaTrack(name, payload);
    } catch {}
  };

  // Robust sender for x_visit (earliest possible + sessionStorage guard)
  const sendVisitIfNeeded = (slug, title) => {
    const key = typeof window !== 'undefined' ? `x_visit_sent:${window.location.pathname}` : '';
    const already = key && typeof window !== 'undefined' && window.sessionStorage?.getItem(key) === '1';
    if (already) return;

    const href = typeof window !== 'undefined' ? window.location.href : '';
    const sp = href ? new URL(href).searchParams : null;
    const utm = sp
      ? {
          utm_source: sp.get('utm_source') || '',
          utm_medium: sp.get('utm_medium') || '',
          utm_campaign: sp.get('utm_campaign') || '',
          utm_content: sp.get('utm_content') || '',
          utm_term: sp.get('utm_term') || '',
        }
      : {};
    trackOnce('x_visit', {
      slug,
      title,
      referrer: typeof document !== 'undefined' ? (document.referrer || '') : '',
      ...utm,
    });
    try { if (key) window.sessionStorage?.setItem(key, '1'); } catch {}
  };

  // Send visit as early as possible
  useLayoutEffect(() => {
    const slug = props?.meme?.slug || '';
    const title = props?.meme?.title || '';
    sendVisitIfNeeded(slug, title);
  }, [props?.meme?.slug, props?.meme?.title]);

  // Vercel Analytics: dwell / first scroll / any click / custom bounce
  useEffect(() => {
    const slug = props?.meme?.slug || '';
    const title = props?.meme?.title || '';

    // Ensure visit got sent (fallback)
    sendVisitIfNeeded(slug, title);

    // Dwell timers (3s, 10s)
    const t3 = setTimeout(() => {
      // Safety: if visit wasn't sent yet, send it now
      sendVisitIfNeeded(slug, title);
      trackOnce('x_stay_3s', { slug, title });
      // 3초 체류만으로도 참여 인정(정상 이탈 분리)
      engagedRef.current = true;
    }, 3000);
    const t10 = setTimeout(() => trackOnce('x_stay_10s', { slug, title }), 10000);

    // Custom bounce timer (7s) — if no engagement by then
    const bounceTimer = setTimeout(() => {
      if (!engagedRef.current) trackOnce('x_bounce', { slug, title, reason: 'no_engagement_within_7s' });
    }, 7000);

    // First scroll = engagement
    const onScroll = () => {
      trackOnce('x_scroll', { slug, title });
      engagedRef.current = true;
      window.removeEventListener('scroll', onScroll);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // First click anywhere = engagement (popunder 친화)
    const onAnyClick = () => {
      if (!clickedRef.current) {
        clickedRef.current = true;
        trackOnce('x_any_click', { slug, title });
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
  }, [props?.meme?.slug, props?.meme?.title]);

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
    name: meme.title,
    description: meme.description,
    contentUrl: thumb || undefined,
    uploadDate,
  };
  return {
    props: {
      meme: { ...meme, __seo: { canonicalUrl, hreflangs, jsonLd, metaImage: thumb } },
      allMemes: items,
      ...(await serverSideTranslations(locale, ['common'])),
    },
    revalidate: 60,
  };
}
