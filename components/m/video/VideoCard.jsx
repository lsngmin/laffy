import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    const [overlay, setOverlay] = useState(true);

    const isImage = mediaType === "image";
    const SMART_LINK = "https://otieu.com/4/9924601";

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

    const restorePoster = useCallback(() => {
        const player = videoJsPlayerRef.current;
        if (!player) return;
        if (typeof player.pause === 'function') player.pause();
        if (typeof player.currentTime === 'function') player.currentTime(0);
        if (player.poster && imageSource) player.poster(imageSource);
        if (player.posterImage?.show) player.posterImage.show();
        if (typeof player.removeClass === 'function') player.removeClass('vjs-has-started');
    }, [imageSource]);

    const openSmartLink = useCallback(() => {
        try {
            window.open(SMART_LINK, "_blank", "noopener");
        } catch {
            // ignore
        }
    }, [SMART_LINK]);

    const handleCardClick = useCallback(() => {
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
            controls: true,
            bigPlayButton: false,
            preload: 'metadata',
        });

        videoJsPlayerRef.current = player;
        const originalDurationRef = { current: null };

        const formatDuration = (seconds) => {
            if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
            if (typeof videojs.formatTime === 'function') {
                return videojs.formatTime(seconds, seconds);
            }
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60)
                .toString()
                .padStart(2, '0');
            return `${mins}:${secs}`;
        };

        const applyLabelledText = (element, formatted, prefixSign = '') => {
            if (!element) return;
            const labelSpan = element.querySelector('.vjs-control-text');
            const labelText = labelSpan?.textContent || '';
            element.textContent = '';
            if (labelText) {
                const span = document.createElement('span');
                span.className = 'vjs-control-text';
                span.textContent = labelText;
                element.appendChild(span);
                element.append(` ${prefixSign}${formatted}`);
            } else {
                element.textContent = `${prefixSign}${formatted}`;
            }
        };

        const updateDurationDisplays = () => {
            if (!resolvedDuration) return;
            const formatted = formatDuration(resolvedDuration);
            const durationDisplay = player.controlBar?.durationDisplay?.el()?.querySelector('.vjs-duration-display');
            applyLabelledText(durationDisplay, formatted);
            const remainingDisplay = player.controlBar?.remainingTimeDisplay?.el()?.querySelector('.vjs-remaining-time-display');
            applyLabelledText(remainingDisplay, formatted, '-');
        };

        const overrideDuration = () => {
            if (!resolvedDuration) return;
            if (!originalDurationRef.current && typeof player.duration === 'function') {
                originalDurationRef.current = player.duration.bind(player);
            }
            if (!player.cache_) player.cache_ = {};
            player.cache_.duration = resolvedDuration;
            player.duration = function durationOverride(value) {
                if (typeof value === 'number' && !Number.isNaN(value)) {
                    this.cache_.duration = value;
                    return value;
                }
                return resolvedDuration;
            };
            player.trigger('durationchange');
            updateDurationDisplays();
        };

        player.ready(() => {
            player.poster(imageSource);
            player.addClass('vjs-keep-controls');
            if (player.controlBar?.show) player.controlBar.show();
            player.userActive(true);
            player.on('userinactive', () => player.userActive(true));

            overrideDuration();
        });

        player.on('loadedmetadata', overrideDuration);
        player.on('timeupdate', updateDurationDisplays);

        player.on('play', () => {
            restorePoster();
            openSmartLink();
        });

        return () => {
            if (originalDurationRef.current) {
                player.duration = originalDurationRef.current;
            }
            player.off('loadedmetadata', overrideDuration);
            player.off('timeupdate', updateDurationDisplays);
            player.dispose();
            videoJsPlayerRef.current = null;
        };
    }, [imageSource, isImage, openSmartLink, resolvedDuration, restorePoster]);

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
                        data-setup='{"controls": true, "bigPlayButton": false}'
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
                    controls={!overlay}
                    preload="metadata"
                    poster={resolvedPoster || undefined}
                >
                    <source src={src} type="video/mp4" />
                </video>
            )}

            {/* 오버레이 아이콘 */}
            {!overlay && (
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
                            "group relative inline-flex select-none items-center justify-center text-black transition-transform duration-200",
                            overlayInteractive ? "cursor-pointer active:scale-95" : "cursor-default opacity-70"
                        )}
                    >
                        <span className="pointer-events-none absolute -inset-6 rounded-[28px] bg-gradient-to-br from-white/40 via-white/5 to-transparent opacity-40 blur-lg transition-opacity duration-300 group-hover:opacity-70" />
                        <span className="relative inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-white/90 via-white/70 to-white/30 shadow-[0_18px_38px_-14px_rgba(15,23,42,0.75)] ring-1 ring-white/60 backdrop-blur">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-12 w-12 text-slate-900 drop-shadow-[0_6px_10px_rgba(15,23,42,0.55)]"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </span>
                    </button>
                </div>
            )}
            <style jsx global>{`
                .video-js.vjs-keep-controls .vjs-control-bar {
                    opacity: 1 !important;
                    visibility: visible !important;
                    display: flex !important;
                }

                .video-js.vjs-keep-controls.vjs-user-inactive .vjs-control-bar {
                    opacity: 1 !important;
                    visibility: visible !important;
                }

                .video-js.vjs-keep-controls .vjs-poster {
                    background-size: cover;
                    background-position: center;
                }
            `}</style>
        </div>
    );
}
