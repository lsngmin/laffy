import Head from "next/head";

import { renderCanonicalElements } from "./canonicalElements";

function normalizeSeo(seo) {
    if (!seo || typeof seo !== "object") return {};
    return seo;
}

export default function VideoSocialMeta({ seo, title, description, player = {} }) {
    const resolvedSeo = normalizeSeo(seo);
    const canonicalGroup = {
        canonicalUrl: typeof resolvedSeo.canonicalUrl === "string" ? resolvedSeo.canonicalUrl : null,
        hreflangs: resolvedSeo.hreflangs,
        jsonLd: resolvedSeo.jsonLd,
    };

    const safeTitle = typeof title === "string" ? title : "";
    const safeDescription = typeof description === "string" ? description : "";

    const playerUrl = typeof player.playerUrl === "string" ? player.playerUrl.trim() : null;
    const streamUrl = typeof player.streamUrl === "string" ? player.streamUrl.trim() : null;
    const thumbnailUrl = typeof player.thumbnailUrl === "string" ? player.thumbnailUrl.trim() : null;
    const streamContentType =
        typeof player.streamContentType === "string" ? player.streamContentType.trim() : null;
    const width = Number.isFinite(player.width) ? String(player.width) : null;
    const height = Number.isFinite(player.height) ? String(player.height) : null;
    const canonicalUrl = canonicalGroup.canonicalUrl;

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
            {renderCanonicalElements(canonicalGroup)}
            {canonicalUrl ? <meta property="og:url" content={canonicalUrl} /> : null}
            <meta property="og:type" content="video.other" />
            {thumbnailUrl ? <meta property="og:image" content={thumbnailUrl} /> : null}
            {streamUrl ? <meta property="og:video" content={streamUrl} /> : null}
            {streamUrl ? <meta property="og:video:url" content={streamUrl} /> : null}
            {streamUrl ? <meta property="og:video:secure_url" content={streamUrl} /> : null}
            {streamContentType ? <meta property="og:video:type" content={streamContentType} /> : null}
            {width ? <meta property="og:video:width" content={width} /> : null}
            {height ? <meta property="og:video:height" content={height} /> : null}
            {safeTitle ? <meta property="og:title" content={safeTitle} /> : null}
            {safeDescription ? <meta property="og:description" content={safeDescription} /> : null}
            <meta name="twitter:card" content="player" />
            {playerUrl ? <meta name="twitter:player" content={playerUrl} /> : null}
            {width ? <meta name="twitter:player:width" content={width} /> : null}
            {height ? <meta name="twitter:player:height" content={height} /> : null}
            {streamUrl ? <meta name="twitter:player:stream" content={streamUrl} /> : null}
            {streamContentType ? (
                <meta name="twitter:player:stream:content_type" content={streamContentType} />
            ) : null}
            {thumbnailUrl ? <meta name="twitter:image" content={thumbnailUrl} /> : null}
            {safeTitle ? <meta name="twitter:title" content={safeTitle} /> : null}
            {safeDescription ? <meta name="twitter:description" content={safeDescription} /> : null}
        </Head>
    );
}
