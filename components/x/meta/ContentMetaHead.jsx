import Head from "next/head";

function renderAlternateLinks(hreflangs) {
    if (!Array.isArray(hreflangs)) return null;

    return hreflangs.map((alt) => {
        if (!alt?.hrefLang || !alt?.href) return null;
        return <link key={`${alt.hrefLang}:${alt.href}`} rel="alternate" hrefLang={alt.hrefLang} href={alt.href} />;
    });
}

function renderJsonLd(jsonLd) {
    if (!jsonLd) return null;

    try {
        const serialized = JSON.stringify(jsonLd);
        if (!serialized || serialized === "{}") return null;
        return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialized }} />;
    } catch {
        return null;
    }
}

function ImagePreviewMeta({ image, title, description }) {
    if (!image) return null;

    return (
        <>
            <meta property="og:image" content={image} />
            <meta property="og:title" content={title} />
            {description && <meta property="og:description" content={description} />}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:image" content={image} />
            <meta name="twitter:title" content={title} />
            {description && <meta name="twitter:description" content={description} />}
        </>
    );
}

function VideoPreviewMeta({
    playerUrl,
    streamUrl,
    streamType = "video/mp4",
    width = 1280,
    height = 720,
    title,
    description,
    thumbnail,
}) {
    if (!playerUrl && !streamUrl) return null;

    const resolvedImage = thumbnail || undefined;

    return (
        <>
            {streamUrl && <meta property="og:video" content={streamUrl} />}
            {streamUrl && <meta property="og:video:secure_url" content={streamUrl} />}
            {streamType && <meta property="og:video:type" content={streamType} />}
            {width && <meta property="og:video:width" content={String(width)} />}
            {height && <meta property="og:video:height" content={String(height)} />}
            {resolvedImage && <meta property="og:image" content={resolvedImage} />}
            <meta property="og:title" content={title} />
            {description && <meta property="og:description" content={description} />}

            <meta name="twitter:card" content="player" />
            {playerUrl && <meta name="twitter:player" content={playerUrl} />}
            {width && <meta name="twitter:player:width" content={String(width)} />}
            {height && <meta name="twitter:player:height" content={String(height)} />}
            {resolvedImage && <meta name="twitter:image" content={resolvedImage} />}
            <meta name="twitter:title" content={title} />
            {description && <meta name="twitter:description" content={description} />}
        </>
    );
}

export default function ContentMetaHead({
    seo,
    title,
    description,
    variant = "image",
    video,
}) {
    if (!seo) return null;

    const canonical = seo?.canonicalUrl;
    const image = seo?.metaImage;
    const previewVariant = variant === "video" ? "video" : "image";

    return (
        <Head>
            {canonical && <link rel="canonical" href={canonical} />}
            {renderAlternateLinks(seo?.hreflangs)}
            {renderJsonLd(seo?.jsonLd)}

            {previewVariant === "video" ? (
                <VideoPreviewMeta
                    title={title}
                    description={description}
                    thumbnail={video?.thumbnail || image}
                    playerUrl={video?.playerUrl}
                    streamUrl={video?.streamUrl}
                    streamType={video?.streamType}
                    width={video?.width}
                    height={video?.height}
                />
            ) : (
                <ImagePreviewMeta image={image} title={title} description={description} />
            )}
        </Head>
    );
}

export function ContentMetaHeadVideo(props) {
    return <ContentMetaHead {...props} variant="video" />;
}
