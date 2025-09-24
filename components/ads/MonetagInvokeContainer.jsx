"use client";

import { useEffect, useRef } from 'react';

export default function MonetagInvokeContainer({
  containerId,
  src,
  className = '',
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !src) return;
    // Ensure container is present before loading script
    const script = document.createElement('script');
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    script.type = 'text/javascript';
    script.src = src;
    // Append after container to ensure vendor finds the target by id
    const parent = containerRef.current.parentElement || document.body;
    parent.appendChild(script);
    return () => {
      try { parent.removeChild(script); } catch {}
    };
  }, [src]);

  return <div id={containerId} ref={containerRef} className={className} />;
}

