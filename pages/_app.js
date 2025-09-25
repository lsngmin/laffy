import '../styles/globals.css';
import { useMemo } from 'react';
import { appWithTranslation } from 'next-i18next';
import { Analytics } from '@vercel/analytics/react';
import { getAnalyticsBeforeSend } from '@/lib/analyticsBridge';
import MonetagOnclick from "@/components/MoneTagOnClick";
import { useRouter } from 'next/router';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const analyticsBeforeSend = useMemo(() => getAnalyticsBeforeSend(), []);
  const routeIsAdmin = typeof router?.pathname === 'string' && router.pathname.startsWith('/admin');
  const disableAds = Boolean(Component?.disableAds || pageProps?.disableAds || routeIsAdmin);
  return (
    <>
      <Analytics beforeSend={analyticsBeforeSend} />
      {!disableAds && <MonetagOnclick />}
      <Component {...pageProps} />
    </>
  );
}

export default appWithTranslation(MyApp);
