"use client";

import { useEffect, useRef, useState } from "react";

export default function BannerAdsMonetag({
  keyId = "510cdcd528dcc869cac2e0fa44c463c0",
  className = "",
}) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 320, height: 50 });

  // 간단한 반응형 사이즈 선택
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pick = () => {
      const w = window.innerWidth || 0;
      if (w >= 1024) return { width: 468, height: 60 };
      if (w >= 360) return { width: 320, height: 50 };
      return { width: 300, height: 50 };
    };
    setSize(pick());
    const onResize = () => setSize(pick());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = containerRef.current;
    if (!el) return;

    // 같은 컨테이너에 중복 삽입 방지
    el.innerHTML = "";

    // atOptions 충돌 방지: 기존 전역 보관 후 스크립트 로드가 끝나면 복구
    const prev = window.atOptions;
    const ourOptions = {
      key: keyId,
      format: "iframe",
      height: size.height,
      width: size.width,
      params: {},
    };
    window.atOptions = ourOptions;

    const s = document.createElement("script");
    s.type = "text/javascript";
    s.async = true;
    s.setAttribute("data-cfasync", "false");
    s.src = `//relishsubsequentlytank.com/${keyId}/invoke.js`;
    s.onload = () => {
      // 스크립트가 로드되면 이전 atOptions 복구
      try { window.atOptions = prev; } catch {}
    };
    s.onerror = () => {
      try { window.atOptions = prev; } catch {}
    };
    // 벤더가 currentScript.parentNode를 기준으로 렌더하도록 컨테이너 내부에 삽입
    el.appendChild(s);

    return () => {
      try {
        el.innerHTML = "";
        window.atOptions = prev;
      } catch {}
    };
  }, [keyId, size.width, size.height]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ display: 'flex', justifyContent: 'center' }}
    />
  );
}
