import Document, { Html, Head, Main, NextScript } from 'next/document';
import Script from 'next/script';

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-GYM11LKQML"
            strategy="afterInteractive"
          />
          <Script
            id="gtag-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-GYM11LKQML');
              `
            }}
          />

          <meta name="monetag" content="e39f02316147e88555f93187d1919598" />
          <Script
            id="monetag-loader"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function () {
                  if (typeof window === 'undefined') return;
                  try {
                    var marker = 'monetagLoaded';
                    var storage = window.sessionStorage;
                    var hasSession = storage && storage.getItem(marker) === '1';

                    if (hasSession || window.__monetagLoaded) {
                      return;
                    }

                    if (storage) {
                      storage.setItem(marker, '1');
                    }
                    window.__monetagLoaded = true;

                    var secondary = document.createElement('script');
                    secondary.async = true;
                    secondary.dataset.cfasync = 'false';
                    secondary.src = 'https://fenoofaussut.net/act/files/tag.min.js?z=9903176';
                    document.head.appendChild(secondary);

                    var bootstrap = document.createElement('script');
                    bootstrap.async = true;
                    bootstrap.dataset.zone = '9903140';
                    bootstrap.src = 'https://al5sm.com/tag.min.js';
                    document.head.appendChild(bootstrap);
                  } catch (err) {
                    console.warn('Monetag loader error', err);
                  }
                })();
              `
            }}
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
