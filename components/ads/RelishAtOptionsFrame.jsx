import { useEffect, useRef } from 'react';

export default function RelishAtOptionsFrame({
  keyId = '4bad6f43b4d5435cfdaf9cb7c11142bc',
  width = 300,
  height = 250,
  params = {},
  srcBase = '//relishsubsequentlytank.com',
  className = '',
}) {
  const slotRef = useRef(null);
  useEffect(() => {
    // Set global atOptions required by the network
    try {
      // eslint-disable-next-line no-undef
      window.atOptions = {
        key: keyId,
        format: 'iframe',
        height,
        width,
        params,
      };
    } catch {}

    const s = document.createElement('script');
    s.type = 'text/javascript';
    s.src = `${srcBase}/${keyId}/invoke.js`;
    const parent = slotRef.current || document.body;
    parent.appendChild(s);
    return () => {
      try { parent.removeChild(s); } catch {}
    };
  }, [height, keyId, params, srcBase, width]);

  // This network writes into the DOM where its script runs; just provide a slot wrapper
  return (
    <div
      ref={slotRef}
      className={className}
      style={{ width, minHeight: height, margin: '0 auto', display: 'grid', placeItems: 'center' }}
    />
  );
}
