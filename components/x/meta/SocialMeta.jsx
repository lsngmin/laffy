import Head from "next/head";

function renderCanonicalMeta({ canonicalUrl, hreflangs, jsonLd }) {
    return (
        <>
            {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}
            {Array.isArray(hreflangs)
                ? hreflangs
                      .filter((alt) => alt && typeof alt === "object")
                      .map((alt) => {
                          const hrefLang = typeof alt?.hrefLang === "string" ? alt.hrefLang : null;
                          const href = typeof alt?.href === "string" ? alt.href : null;
                          if (!hrefLang || !href) return null;
                          return <link key={`${hrefLang}:${href}`} rel="alternate" hrefLang={hrefLang} href={href} />;
                      })
                      .filter(Boolean)
                : null}
            {jsonLd ? (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: (() => {
                            try {
                                return JSON.stringify(jsonLd);
                            } catch {
                                return "{}";
                            }
                        })(),
                    }}
                />
            ) : null}
        </>
    );
}

export function ImageSocialMeta({ seo, title, description }) {
    const resolvedSeo = seo && typeof seo === "object" ? seo : {};
    const canonicalGroup = {
        canonicalUrl: typeof resolvedSeo.canonicalUrl === "string" ? resolvedSeo.canonicalUrl : null,
        hreflangs: resolvedSeo.hreflangs,
        jsonLd: resolvedSeo.jsonLd,
    };
    const metaImage = typeof resolvedSeo.metaImage === "string" ? resolvedSeo.metaImage : null;
    const safeTitle = typeof title === "string" ? title : "";
    const safeDescription = typeof description === "string" ? description : "";

    if (!metaImage && !canonicalGroup.canonicalUrl && !Array.isArray(canonicalGroup.hreflangs) && !canonicalGroup.jsonLd) {
        return null;
    }

    return (
        <Head>
            {renderCanonicalMeta(canonicalGroup)}
            {metaImage ? <meta property="og:image" content={metaImage} /> : null}
            {safeTitle ? <meta property="og:title" content={safeTitle} /> : null}
            {safeDescription ? <meta property="og:description" content={safeDescription} /> : null}
            {metaImage ? <meta name="twitter:image" content={metaImage} /> : null}
            {safeTitle ? <meta name="twitter:title" content={safeTitle} /> : null}
            {safeDescription ? <meta name="twitter:description" content={safeDescription} /> : null}
            <meta name="twitter:card" content="summary_large_image" />
        </Head>
    );
}

export function VideoSocialMeta({ seo, title, description, player = {} }) {
    const resolvedSeo = seo && typeof seo === "object" ? seo : {};
    const canonicalGroup = {
        canonicalUrl: typeof resolvedSeo.canonicalUrl === "string" ? resolvedSeo.canonicalUrl : null,
        hreflangs: resolvedSeo.hreflangs,
        jsonLd: resolvedSeo.jsonLd,
    };

    const safeTitle = typeof title === "string" ? title : "";
    const safeDescription = typeof description === "string" ? description : "";

    const playerUrl = typeof player.playerUrl === "string" ? player.playerUrl : null;
    const streamUrl = typeof player.streamUrl === "string" ? player.streamUrl : null;
    const thumbnailUrl = typeof player.thumbnailUrl === "string" ? player.thumbnailUrl : null;
    const width = Number.isFinite(player.width) ? String(player.width) : null;
    const height = Number.isFinite(player.height) ? String(player.height) : null;

    if (
        !playerUrl &&
        !streamUrl &&
        !thumbnailUrl &&
        !canonicalGroup.canonicalUrl &&
        !Array.isArray(canonicalGroup.hreflangs) &&
        !canonicalGroup.jsonLd
    ) {
        return null;
    }

    return (
        <Head>
            {renderCanonicalMeta(canonicalGroup)}
            {thumbnailUrl ? <meta property="og:image" content={thumbnailUrl} /> : null}
            {streamUrl ? <meta property="og:video" content={streamUrl} /> : null}
            {safeTitle ? <meta property="og:title" content={safeTitle} /> : null}
            {safeDescription ? <meta property="og:description" content={safeDescription} /> : null}
            <meta name="twitter:card" content="player" />
            {playerUrl ? <meta name="twitter:player" content={playerUrl} /> : null}
            {width ? <meta name="twitter:player:width" content={width} /> : null}
            {height ? <meta name="twitter:player:height" content={height} /> : null}
            {thumbnailUrl ? <meta name="twitter:image" content={thumbnailUrl} /> : null}
            {safeTitle ? <meta name="twitter:title" content={safeTitle} /> : null}
            {safeDescription ? <meta name="twitter:description" content={safeDescription} /> : null}
        </Head>
    );
}
