import { useEffect } from 'react';

const SESSION_KEY = 'monetagLoaded';

export default function MonetagLoader() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      if (window.__monetagLoaded) {
        return;
      }

      const storage = window.sessionStorage;
      const alreadyLoaded = storage && storage.getItem(SESSION_KEY) === '1';

      if (alreadyLoaded) {
        window.__monetagLoaded = true;
        return;
      }

      if (storage) {
        storage.setItem(SESSION_KEY, '1');
      }
      window.__monetagLoaded = true;

      const secondary = document.createElement('script');
      secondary.async = true;
      secondary.dataset.cfasync = 'false';
      secondary.src = 'https://fenoofaussut.net/act/files/tag.min.js?z=9903176';
      document.head.appendChild(secondary);

      const bootstrap = document.createElement('script');
      bootstrap.async = true;
      bootstrap.dataset.zone = '9903140';
      bootstrap.src = 'https://al5sm.com/tag.min.js';
      document.head.appendChild(bootstrap);
    } catch (error) {
      console.warn('Monetag loader error', error);
    }
  }, []);

  return null;
}
