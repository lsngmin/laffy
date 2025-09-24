import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { getAllContent, getContentBySlug } from '@/utils/contentSource';
import MemeDetailPage from '@/components/m/MemeDetailPage';
import dynamic from 'next/dynamic';

const BannerTop = dynamic(() => import('@/components/ads/RelishBannerInvoke'), { ssr: false });
const BannerRect = dynamic(() => import('@/components/ads/RelishAtOptionsFrame'), { ssr: false });

export default function ImageDetail(props) {
  return (
    <MemeDetailPage
      {...props}
      disableVideo
      hideBackToFeed
      backSlot={<div className="mt-6 flex justify-center"><BannerTop /></div>}
      showRecommended={false}
      recommendSlot={
        <div className="mt-10 flex justify-center">
          <BannerRect width={300} height={250} />
        </div>
      }
      onPreviewClick={() => {
        try { window.open('https://otieu.com/4/9924601', '_blank', 'noopener'); } catch {}
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
  return {
    props: {
      meme,
      allMemes: items,
      ...(await serverSideTranslations(locale, ['common'])),
    },
    revalidate: 60,
  };
}
