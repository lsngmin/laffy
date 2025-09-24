import { useEffect } from 'react';

export default function RelishBannerInvoke({
  containerId = 'container-423e3c0edc8f597be9c7991231d2dd57',
  src = '//relishsubsequentlytank.com/423e3c0edc8f597be9c7991231d2dd57/invoke.js',
  className = '',
}) {
  useEffect(() => {
    const s = document.createElement('script');
    s.async = true;
    s.setAttribute('data-cfasync', 'false');
    s.src = src;
    document.body.appendChild(s);
    return () => {
      try { document.body.removeChild(s); } catch {}
    };
  }, [src]);

  return <div id={containerId} className={className} />;
}

