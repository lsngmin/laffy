import '../styles/globals.css';
import { appWithTranslation } from 'next-i18next';
import { Analytics } from '@vercel/analytics/next';
import MonetagOnclick from "@/components/MoneTagOnClick";

function MyApp({ Component, pageProps }) {
  return (
    <>
        <MonetagOnclick />
        <Component {...pageProps} />
      <Analytics />
    </>
  );
}

export default appWithTranslation(MyApp);
