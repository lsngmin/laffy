import Document, { Html, Head, Main, NextScript } from 'next/document';

export default class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);
    const path = ctx?.req?.url || '';
    const isAdmin = path.startsWith('/admin');
    return { ...initialProps, isAdmin };
  }
  render() {
    const { isAdmin } = this.props;
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
          {/* Additional zone script (disabled on /admin) */}
          {!isAdmin && (
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  (function(s){
                    s.dataset.zone='9906397';
                    s.src='https://forfrogadiertor.com/tag.min.js';
                  })([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')));
                `,
              }}
            />
          )}


        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
