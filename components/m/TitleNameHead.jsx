import Head from "next/head";

export default function TitleNameHead({
  title,
  description,
  pageUrl,
  imageUrl,
  videoUrl,
  videoWidth,
  videoHeight,
  twitterSite,
}) {
  const fullTitle = title ? `${title} | Laffy` : "Laffy";
  const cardType = videoUrl ? 'player' : 'summary_large_image';
  const ogType = videoUrl ? 'video.other' : 'article';

  return (
    <Head>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}

      {/* Open Graph */}
      {pageUrl && <meta property="og:url" content={pageUrl} />}
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />} 
      <meta property="og:type" content={ogType} />
      {imageUrl && <meta property="og:image" content={imageUrl} />}
      {videoUrl && (
        <>
          <meta property="og:video" content={videoUrl} />
          <meta property="og:video:secure_url" content={videoUrl} />
          <meta property="og:video:type" content="video/mp4" />
          {videoWidth && <meta property="og:video:width" content={String(videoWidth)} />}
          {videoHeight && <meta property="og:video:height" content={String(videoHeight)} />}
        </>
      )}

      {/* Twitter Card */}
      <meta name="twitter:card" content={cardType} />
      {twitterSite && <meta name="twitter:site" content={twitterSite} />}
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      {imageUrl && <meta name="twitter:image" content={imageUrl} />}
      {videoUrl && (
        <>
          {/* Player Card metadata (note: some domains require allowlisting by Twitter) */}
          {pageUrl && <meta name="twitter:player" content={pageUrl} />}
          {videoWidth && <meta name="twitter:player:width" content={String(videoWidth)} />}
          {videoHeight && <meta name="twitter:player:height" content={String(videoHeight)} />}
          <meta name="twitter:player:stream" content={videoUrl} />
          <meta name="twitter:player:stream:content_type" content="video/mp4" />
        </>
      )}
    </Head>
  );
}
