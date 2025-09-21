import '../styles/globals.css';
import { appWithTranslation } from 'next-i18next';
import MonetagLoader from '../components/MonetagLoader';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <MonetagLoader />
      <Component {...pageProps} />
    </>
  );
}

export default appWithTranslation(MyApp);
