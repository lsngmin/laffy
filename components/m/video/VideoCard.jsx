import { useCallback, useEffect, useMemo, useRef } from "react";
import clsx from "clsx";
import videojs from "video.js";
import "video.js/dist/video-js.css";


export default function VideoCard({
                                      poster,
                                      src,
                                      title,
                                      aspect,
                                      disablePlay = false,
                                      mediaType = "video",
                                      onPreviewClick,
                                      durationSeconds,
                                  }) {
    const vRef = useRef(null);
    const videoJsPlayerRef = useRef(null);
    const imageVideoRef = useRef(null);
    const videoJsId = useMemo(() => `video-card-${Math.random().toString(36).slice(2)}`, []);

    const isImage = mediaType === "image";
    const SMART_LINK = "https://relishsubsequentlytank.com/m4dat49uw?key=5c0b078a04533db894c7b305e5dd7a67";

    const interactivePreview = useMemo(() => typeof onPreviewClick === 'function', [onPreviewClick]);
    const overlayInteractive = (!disablePlay && !isImage) || interactivePreview;

    const handleOverlayClick = (event) => {
        if (!overlayInteractive) return;
        if (event?.preventDefault) event.preventDefault();
        if (event?.stopPropagation) event.stopPropagation();
        if (interactivePreview) {
            try { onPreviewClick(); } catch {}
        }
        restorePoster();
        openSmartLink();
    };

    const cleanedPoster = typeof poster === "string" && poster.trim().length > 0 ? poster : null;
    const cleanedSrc = typeof src === "string" && src.trim().length > 0 ? src : null;
    const resolvedPoster = cleanedPoster || (isImage ? cleanedSrc : null);
    const imageSource = isImage ? resolvedPoster || cleanedSrc : null;

    const restorePoster = useCallback(() => {
        const player = videoJsPlayerRef.current;
        if (player) {
            player.pause();
            player.currentTime(0);

            if (imageSource) {
                player.poster(imageSource);
                if (player.posterImage?.show) player.posterImage.show();
            }

            // ✅ 포스터가 사라지지 않도록 Video.js 상태 초기화
            if (typeof player.removeClass === "function") {
                player.removeClass("vjs-has-started");
            }
        }
    }, [imageSource]);

    const openSmartLink = useCallback(() => {
        try {
            window.location.href = SMART_LINK;
        } catch {
            // ignore
        }
    }, [SMART_LINK]);

    const handleCardClick = useCallback((event) => {
        if (event?.preventDefault) event.preventDefault();
        if (event?.stopPropagation) event.stopPropagation();
        restorePoster();
        openSmartLink();
    }, [openSmartLink, restorePoster]);

    const resolvedDuration = useMemo(() => {
        if (Number.isFinite(durationSeconds) && durationSeconds > 0) return durationSeconds;
        return null;
    }, [durationSeconds]);

    useEffect(() => {
        if (!isImage) return () => {};
        if (!imageSource || !imageVideoRef.current) return () => {};

        const player = videojs(imageVideoRef.current, {
            controls: false,
            bigPlayButton: true,
            preload: "metadata",
            autoplay: false
        });

        videoJsPlayerRef.current = player;

        player.ready(() => {
            player.poster(imageSource);
            player.addClass("vjs-keep-controls");
            if (player.controlBar?.show) player.controlBar.show();
            player.userActive(true);
            player.on("userinactive", () => player.userActive(true));

            if (resolvedDuration !== null) {
                const forcedDuration = resolvedDuration;
                player.duration = () => forcedDuration;
                player.trigger("durationchange");
            }
        });

        const triggerRedirect = (event) => {
            event?.preventDefault?.();
            restorePoster();
            openSmartLink(); // ✅ 이제 클릭 시 SmartLink 이동
        };

        player.on("play", (event) => {
            event.preventDefault();
            player.pause();
            triggerRedirect(event);
        });
        player.on('touchstart', triggerRedirect);
        player.on('pointerdown', triggerRedirect);
        player.on('click', triggerRedirect);

        return () => {
            player.off('play', triggerRedirect);
            player.off('touchstart', triggerRedirect);
            // player.off('pointerdown', triggerRedirect);
            player.off('click', triggerRedirect);
            player.dispose();
            videoJsPlayerRef.current = null;
        };
    }, [imageSource, isImage, openSmartLink, resolvedDuration, restorePoster]);

    useEffect(() => {
        if (isImage || disablePlay) return () => {};
        const videoEl = vRef.current;
        if (!videoEl) return () => {};
        const handler = (event) => {
            handleCardClick(event);
        };
        videoEl.addEventListener('click', handler, true);
        videoEl.addEventListener('touchstart', handler, true);
        videoEl.addEventListener('pointerdown', handler, true);
        return () => {
            videoEl.removeEventListener('click', handler, true);
            videoEl.removeEventListener('touchstart', handler, true);
            videoEl.removeEventListener('pointerdown', handler, true);
        };
    }, [disablePlay, handleCardClick, isImage]);

    return (
        <div
            className={clsx(
                "relative overflow-hidden rounded-3xl ring-1 ring-slate-800/70 shadow-[0_25px_60px_-35px_rgba(30,41,59,0.8)]",
                aspect
            )}
            onClickCapture={handleCardClick}
        >
            {isImage ? (
                imageSource ? (
                    <video
                        id={videoJsId}
                        ref={imageVideoRef}
                        className="video-js vjs-default-skin h-full w-full object-cover"
                        controls
                        preload="metadata"
                        poster={imageSource}
                        data-setup='{"controls": true, "bigPlayButton": true}'
                    >
                        <source src="/1.mp4" type="video/mp4" />
                    </video>
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,_#6366f1_0%,_#0f172a_70%)] text-sm font-semibold text-slate-100">
                        이미지 미리보기를 불러오지 못했어요
                    </div>
                )
            ) : disablePlay ? (
                // 썸네일 + 비디오 느낌 (재생 안 됨)
                <video
                    id="my-video"
                    className="video-js h-full w-full object-cover pointer-events-none"
                    controls
                    preload="auto"
                    poster={resolvedPoster || undefined}
                    data-setup="{}"
                />
            ) : (
                // 실제 동영상
                <video
                    ref={vRef}
                    className="h-full w-full object-cover"
                    playsInline
                    controls={false}
                    preload="metadata"
                    poster={resolvedPoster || undefined}
                >
                    <source src={src} type="video/mp4" />
                </video>
            )}

        </div>
    );
}
