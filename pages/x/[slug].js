import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { getAllContent, getContentBySlug } from '@/utils/contentSource';
import MemeDetailPage from '@/components/m/MemeDetailPage';
import dynamic from 'next/dynamic';
import QuadAdGrid from '@/components/ads/QuadAdGrid';
const MonetagInvoke = dynamic(() => import('@/components/ads/MonetagInvokeContainer'), { ssr: false });
import * as g from '@/lib/gtag';
import { vaTrack } from '@/lib/va';
import { useEffect } from 'react';

const BannerTop = dynamic(() => import('@/components/ads/RelishBannerInvoke'), { ssr: false });
const BannerRect = dynamic(() => import('@/components/ads/RelishAtOptionsFrame'), { ssr: false });

export default function ImageDetail(props) {
  // Vercel Analytics dwell/scroll events
  useEffect(() => {
    const slug = props?.meme?.slug || '';
    const title = props?.meme?.title || '';
    const t3 = setTimeout(() => vaTrack('x_stay_3s', { slug, title }), 3000);
    const t10 = setTimeout(() => vaTrack('x_stay_10s', { slug, title }), 10000);
    const onScroll = () => { vaTrack('x_scroll', { slug, title }); window.removeEventListener('scroll', onScroll); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { clearTimeout(t3); clearTimeout(t10); window.removeEventListener('scroll', onScroll); };
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
