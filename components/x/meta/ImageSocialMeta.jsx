import Head from "next/head";

import { renderCanonicalElements } from "./canonicalElements";

function normalizeSeo(seo) {
    if (!seo || typeof seo !== "object") return {};
    return seo;
}

export default function ImageSocialMeta({ seo, title, description }) {
    const resolvedSeo = normalizeSeo(seo);
    const canonicalGroup = {
        canonicalUrl: typeof resolvedSeo.canonicalUrl === "string" ? resolvedSeo.canonicalUrl : null,
        hreflangs: resolvedSeo.hreflangs,
        jsonLd: resolvedSeo.jsonLd,
    };

    const metaImage = typeof resolvedSeo.metaImage === "string" ? resolvedSeo.metaImage : null;
    const safeTitle = typeof title === "string" ? title : "";
    const safeDescription = typeof description === "string" ? description : "";
    const twitterCard = typeof resolvedSeo.twitterCard === "string" && resolvedSeo.twitterCard.trim()
        ? resolvedSeo.twitterCard.trim()
        : "summary_large_image";

    if (
        !metaImage &&
        !canonicalGroup.canonicalUrl &&
        !Array.isArray(canonicalGroup.hreflangs) &&
        !canonicalGroup.jsonLd
    ) {
        return null;
    }

    return (
        <Head>
            {renderCanonicalElements(canonicalGroup)}
            {metaImage ? <meta property="og:image" content={metaImage} /> : null}
            {safeTitle ? <meta property="og:title" content={safeTitle} /> : null}
            {safeDescription ? <meta property="og:description" content={safeDescription} /> : null}
            {metaImage ? <meta name="twitter:image" content={metaImage} /> : null}
            {safeTitle ? <meta name="twitter:title" content={safeTitle} /> : null}
            {safeDescription ? <meta name="twitter:description" content={safeDescription} /> : null}
            <meta name="twitter:card" content={twitterCard} />
        </Head>
    );
}
