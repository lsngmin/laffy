"use client";

import { useEffect } from "react";

export default function BannerAdsMonetag() {
    useEffect(() => {
        // 전역 atOptions 정의
        window.atOptions = {
            key: "510cdcd528dcc869cac2e0fa44c463c0",
            format: "iframe",
            height: 60,
            width: 468,
            params: {},
        };

        // 스크립트 동적 삽입
        const s = document.createElement("script");
        s.type = "text/javascript";
        s.src =
            "//relishsubsequentlytank.com/510cdcd528dcc869cac2e0fa44c463c0/invoke.js";
        s.async = true;
        document.body.appendChild(s);

        return () => {
            try {
                s.remove();
            } catch {}
        };
    }, []);

    // 광고가 iframe으로 삽입되므로 렌더링 시점엔 빈 div만 반환
    return <div id="rel-ads-banner" />;
}
