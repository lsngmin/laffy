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
                        overlayInteractive
                            ? "hover:bg-black/10"
                            : "bg-black/20"
                    )}
                >
                    <button
                        type="button"
                        onClick={handleOverlayClick}
                        disabled={!overlayInteractive}
                        aria-label={overlayInteractive ? (interactivePreview ? "스폰서로 이동" : "영상 재생") : "미리보기"}
                        className={clsx(
                            "flex flex-col items-center gap-2 rounded-full px-6 py-6 text-white transition",
                            overlayInteractive
                                ? "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                                : "cursor-default opacity-80"
                        )}
                        style={{ background: "none", border: "none" }}
                    >
                        <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm grid place-items-center">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-12 w-12 text-white drop-shadow-lg"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                        {title && (
                            <span className="text-white/90 text-sm font-semibold text-center">
                                {title}
                            </span>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
