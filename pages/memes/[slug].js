import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import AdSlot from '../../components/AdSlot';
import { memes, getMemeBySlug } from '../../lib/memes';

function TwitterEmbed({ url }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!url) return;
    const onLoad = () => {
      window.twttr?.widgets?.load(containerRef.current);
    };

    let script = document.querySelector('script[src="https://platform.twitter.com/widgets.js"]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.defer = true;
      script.addEventListener('load', onLoad);
      document.body.appendChild(script);
    } else if (script?.getAttribute('data-loaded') === 'true') {
      onLoad();
    } else {
      script.addEventListener('load', onLoad);
    }

    script?.setAttribute('data-loaded', 'true');

    return () => {
      script?.removeEventListener('load', onLoad);
    };
  }, [url]);

  return (
    <div ref={containerRef} className="twitter-embed w-full">
      <blockquote className="twitter-tweet" data-theme="dark">
        <a href={url}>Twitter meme</a>
      </blockquote>
    </div>
  );
}

export default function MemeDetail({ meme }) {
  const { t } = useTranslation('common');

  if (!meme) {
    return null;
  }

  return (
    <>
      <Head>
        <title>{`${meme.title} | Laffy`}</title>
        <meta name="description" content={meme.description} />
      </Head>
      <div className="min-h-screen bg-slate-900 px-4 pb-16 pt-8 sm:px-6">
        <main className="mx-auto flex max-w-2xl flex-col gap-8">
          <Link href="/" className="text-sm text-indigo-300 transition hover:text-indigo-200">
            {t('backToFeed')}
          </Link>

          <article className="rounded-3xl bg-slate-800/80 p-6 shadow-xl shadow-slate-900/40 ring-1 ring-slate-700/60">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">{meme.title}</h1>
            <p className="mt-3 text-sm text-slate-300">{meme.description}</p>

            <div className="mt-6 overflow-hidden rounded-3xl">
              {meme.type === 'video' ? (
                <video
                  className="aspect-[9/16] w-full rounded-3xl object-cover"
                  controls
                  preload="metadata"
                  playsInline
                  poster={meme.poster}
                >
                  <source src={meme.src} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <TwitterEmbed url={meme.url} />
              )}
            </div>

            {meme.type === 'twitter' && (
              <div className="mt-6">
                <a
                  href={meme.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-indigo-200 transition hover:bg-white/20"
                >
                  {t('watchOnTwitter')}
                </a>
              </div>
            )}
          </article>

          <AdSlot />
        </main>
      </div>
    </>
  );
}

export async function getStaticPaths({ locales }) {
  const paths = memes.flatMap((meme) =>
    locales.map((locale) => ({
      params: { slug: meme.slug },
      locale,
    }))
  );

  return {
    paths,
    fallback: false,
  };
}

export async function getStaticProps({ params, locale }) {
  const meme = getMemeBySlug(params.slug);

  if (!meme) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      meme,
      ...(await serverSideTranslations(locale, ['common'])),
    },
    revalidate: 60,
  };
}
