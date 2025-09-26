"use client";

import { useEffect, useRef } from "react";

export default function BannerAdsMonetag({ containerId, src, className = "" }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !src) return;

    const parent = container.parentElement || document.body;
    const script = document.createElement("script");
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.type = "text/javascript";
    script.src = src;
    parent.appendChild(script);

    return () => {
      try {
        parent.removeChild(script);
      } catch {}
    };
  }, [src]);

  return <div id={containerId} ref={containerRef} className={className} />;
}
