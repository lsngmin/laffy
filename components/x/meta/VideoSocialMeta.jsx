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

    const playerUrl = typeof player.playerUrl === "string" ? player.playerUrl : null;
    const streamUrl = typeof player.streamUrl === "string" ? player.streamUrl : null;
    const thumbnailUrl = typeof player.thumbnailUrl === "string" ? player.thumbnailUrl : null;
    const streamContentType = typeof player.streamContentType === "string" ? player.streamContentType : null;
    const width = Number.isFinite(player.width) ? String(player.width) : null;
    const height = Number.isFinite(player.height) ? String(player.height) : null;
    const resolvedStreamContentType = streamContentType || (streamUrl ? "video/mp4" : null);
    const hasVideo = Boolean(playerUrl || streamUrl);
    const twitterCardType = hasVideo ? "player" : "summary_large_image";

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
            {canonicalGroup.canonicalUrl ? (
                <meta property="og:url" content={canonicalGroup.canonicalUrl} />
            ) : null}
            <meta property="og:type" content={hasVideo ? "video.other" : "website"} />
            {thumbnailUrl ? <meta property="og:image" content={thumbnailUrl} /> : null}
            {thumbnailUrl ? <meta property="og:image:secure_url" content={thumbnailUrl} /> : null}
            {streamUrl ? <meta property="og:video" content={streamUrl} /> : null}
            {streamUrl ? <meta property="og:video:url" content={streamUrl} /> : null}
            {streamUrl ? <meta property="og:video:secure_url" content={streamUrl} /> : null}
            {resolvedStreamContentType ? (
                <meta property="og:video:type" content={resolvedStreamContentType} />
            ) : null}
            {width ? <meta property="og:video:width" content={width} /> : null}
            {height ? <meta property="og:video:height" content={height} /> : null}
            {safeTitle ? <meta property="og:title" content={safeTitle} /> : null}
            {safeDescription ? <meta property="og:description" content={safeDescription} /> : null}
            <meta name="twitter:card" content={twitterCardType} />
            {playerUrl ? <meta name="twitter:player" content={playerUrl} /> : null}
            {width ? <meta name="twitter:player:width" content={width} /> : null}
            {height ? <meta name="twitter:player:height" content={height} /> : null}
            {streamUrl ? <meta name="twitter:player:stream" content={streamUrl} /> : null}
            {resolvedStreamContentType ? (
                <meta name="twitter:player:stream:content_type" content={resolvedStreamContentType} />
            ) : null}
            {thumbnailUrl ? <meta name="twitter:image" content={thumbnailUrl} /> : null}
            {safeTitle ? <meta name="twitter:title" content={safeTitle} /> : null}
            {safeDescription ? <meta name="twitter:description" content={safeDescription} /> : null}
        </Head>
    );
}
