import Document, { Html, Head, Main, NextScript } from 'next/document';

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          {/* Google Analytics */}
          <script async src="https://www.googletagmanager.com/gtag/js?id=G-GYM11LKQML"></script>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);} 
                gtag('js', new Date());
                gtag('config', 'G-GYM11LKQML');
              `,
            }}
          />

          {/* Monetag - bootstrap IIFE and external tag */}
          <script data-cfasync="false" src="/ads/monetag-inline.js"></script>
          <script src="//x7i0.com/tag.min.js" data-zone="9903140" data-cfasync="false" async></script>
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

