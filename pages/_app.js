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
  const isAdmin = typeof router?.pathname === 'string' && router.pathname.startsWith('/admin');
  return (
    <>
      <Analytics beforeSend={analyticsBeforeSend} />
      {!isAdmin && <MonetagOnclick />}
      <Component {...pageProps} />
    </>
  );
}

export default appWithTranslation(MyApp);
