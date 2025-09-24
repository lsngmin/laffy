import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

export default function VideoCard({
                                      poster,
                                      src,
                                      title,
                                      aspect,
                                      disablePlay = false,
                                      mediaType = "video",
                                      onPreviewClick,
                                  }) {
    const vRef = useRef(null);
    const [overlay, setOverlay] = useState(true);

    const isImage = mediaType === "image";

    useEffect(() => {
        setOverlay(true);
    }, [mediaType, src, disablePlay]);

    const play = async () => {
        if (disablePlay || isImage) return;
        try {
            await vRef.current?.play();
            setOverlay(false);
        } catch {
            setOverlay(false);
        }
    };

    const interactivePreview = useMemo(() => typeof onPreviewClick === 'function', [onPreviewClick]);
    const overlayInteractive = (!disablePlay && !isImage) || interactivePreview;

    const handleOverlayClick = () => {
        if (!overlayInteractive) return;
        if (interactivePreview) {
            try { onPreviewClick(); } catch {}
            return;
        }
        play();
    };

    const cleanedPoster = typeof poster === "string" && poster.trim().length > 0 ? poster : null;
    const cleanedSrc = typeof src === "string" && src.trim().length > 0 ? src : null;
    const resolvedPoster = cleanedPoster || (isImage ? cleanedSrc : null);
    const imageSource = isImage ? resolvedPoster || cleanedSrc : null;

    return (
        <div
            className={clsx(
                "relative overflow-hidden rounded-3xl ring-1 ring-slate-800/70 shadow-[0_25px_60px_-35px_rgba(30,41,59,0.8)]",
                aspect
            )}
        >
            {isImage ? (
                imageSource ? (
                    <img
                        src={imageSource}
                        alt={title || "Uploaded media"}
                        className="h-full w-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,_#6366f1_0%,_#0f172a_70%)] text-sm font-semibold text-slate-100">
                        이미지 미리보기를 불러오지 못했어요
                    </div>
                )
            ) : disablePlay ? (
                // 썸네일 + 비디오 느낌 (재생 안 됨)
                <video
                    className="h-full w-full object-cover pointer-events-none"
                    playsInline
                    preload="metadata"
                    poster={resolvedPoster || undefined}
                >
                    <source src={src} type="video/mp4" />
                </video>
            ) : (
                // 실제 동영상
                <video
                    ref={vRef}
                    className="h-full w-full object-cover"
                    playsInline
                    controls={!overlay}
                    preload="metadata"
                    poster={resolvedPoster || undefined}
                >
                    <source src={src} type="video/mp4" />
                </video>
            )}

            {/* 오버레이 아이콘 */}
            {overlay && (
                <div
                    className={clsx(
                        "absolute inset-0 grid place-items-center transition",
                        overlayInteractive ? "bg-black/10" : "bg-black/20"
                    )}
                >
                    <button
                        type="button"
                        onClick={handleOverlayClick}
                        disabled={!overlayInteractive}
                        aria-label={overlayInteractive ? (interactivePreview ? "스폰서로 이동" : "영상 재생") : "미리보기"}
                        className={clsx(
                            "group relative inline-flex select-none items-center justify-center rounded-full p-4 text-white transition-transform duration-200",
                            overlayInteractive ? "cursor-pointer active:scale-95" : "cursor-default opacity-80"
                        )}
                        style={{ background: "none", border: "none" }}
                    >
                        {/* Outer glow ring */}
                        <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/40 via-white/10 to-transparent blur-md opacity-60" />
                        {/* 3D base button */}
                        <span className="relative grid h-24 w-24 place-items-center rounded-full bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.25),_rgba(255,255,255,0)_45%),linear-gradient(180deg,_rgba(255,255,255,0.25),_rgba(255,255,255,0)),linear-gradient(180deg,_rgba(0,0,0,0.45),_rgba(0,0,0,0.6))] shadow-[inset_0_6px_14px_rgba(255,255,255,0.25),_0_18px_40px_-12px_rgba(0,0,0,0.6)] backdrop-blur-sm transition duration-300 group-hover:brightness-110">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-12 w-12 drop-shadow-[0_6px_10px_rgba(0,0,0,0.6)]"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </span>
                        {/* Label below button */}
                        {title && (
                            <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/50 px-3 py-1 text-xs font-semibold shadow-md">
                                {title}
                            </span>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
