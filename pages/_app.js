import '../styles/globals.css';
import { appWithTranslation } from 'next-i18next';
import { Analytics } from '@vercel/analytics/next';
import MonetagOnclick from "@/components/MoneTagOnClick";
import { useRouter } from 'next/router';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const isAdmin = typeof router?.pathname === 'string' && router.pathname.startsWith('/admin');
  return (
    <>
        {!isAdmin && <MonetagOnclick />}
        <Component {...pageProps} />
      <Analytics />
    </>
  );
}

export default appWithTranslation(MyApp);
