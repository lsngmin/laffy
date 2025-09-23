import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { getAllContent, getContentBySlug } from '@/utils/contentSource';
import MemeDetailPage from '@/components/m/MemeDetailPage';

export default function MemeDetail(props) {
  return <MemeDetailPage {...props} />;
}

export async function getStaticPaths({ locales }) {
  const { items } = await getAllContent();
  const paths = items
    .filter((item) => (item.type || '').toLowerCase() !== 'image')
    .flatMap((meme) =>
      locales.map((locale) => ({ params: { slug: meme.slug }, locale }))
    );
  return { paths, fallback: 'blocking' };
}

export async function getStaticProps({ params, locale }) {
  const { meme, items } = await getContentBySlug(params.slug);
  if (!meme) return { notFound: true };

  if ((meme.type || '').toLowerCase() === 'image') {
    return {
      redirect: {
        destination: `/x/${params.slug}`,
        permanent: false,
      },
    };
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
