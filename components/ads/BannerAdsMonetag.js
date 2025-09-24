"use client";

import { useEffect, useRef } from "react";

export default function BannerAdsMonetag({
  keyId = "510cdcd528dcc869cac2e0fa44c463c0",
  width = 468,
  height = 60,
  className = "",
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = containerRef.current;
    if (!el) return;

    // 같은 컨테이너에 중복 삽입 방지
    el.innerHTML = "";

    // 전역 atOptions는 invoke.js가 평가될 때의 currentScript 기준으로 사용되므로
    // 스크립트를 컨테이너에 붙여서 충돌을 최소화한다.
    window.atOptions = {
      key: keyId,
      format: "iframe",
      height,
      width,
      params: {},
    };

    const s = document.createElement("script");
    s.type = "text/javascript";
    s.async = true;
    s.setAttribute("data-cfasync", "false");
    s.src = `//relishsubsequentlytank.com/${keyId}/invoke.js`;
    el.appendChild(s);

    return () => {
      try { el.innerHTML = ""; } catch {}
    };
  }, [keyId, width, height]);

  return <div ref={containerRef} className={className} />;
}
