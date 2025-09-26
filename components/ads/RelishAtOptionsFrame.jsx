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
    const slotEl = slotRef.current;
    if (slotEl) {
      slotEl.innerHTML = '';
    }

    let previousAtOptions;
    let restored = false;
    const restoreAtOptions = () => {
      if (restored) return;
      restored = true;
      try {
        if (typeof previousAtOptions === 'undefined') {
          delete window.atOptions;
        } else {
          window.atOptions = previousAtOptions;
        }
      } catch {}
    };

    // Set global atOptions required by the network
    try {
      previousAtOptions = window.atOptions;
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
    s.onload = restoreAtOptions;
    s.onerror = restoreAtOptions;
    const parent = slotRef.current || document.body;
    parent.appendChild(s);
    return () => {
      restoreAtOptions();
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
