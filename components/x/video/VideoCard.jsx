import { useCallback, useEffect, useMemo, useRef } from "react";
import clsx from "clsx";
import videojs from "video.js";
import "video.js/dist/video-js.css";

import { openSmartLink } from "@/components/x/ads/smartLink";

import VideoPreviewPlayer from "./VideoPreviewPlayer";
import DEFAULT_VIDEOJS_OPTIONS from "./videoPlayerOptions";


function sanitizeString(value) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

export default function VideoCard({
    poster,
    title,
    aspect,
    onPreviewClick,
    durationSeconds,
}) {
    const videoElementRef = useRef(null);
    const videoJsPlayerRef = useRef(null);
    const videoJsId = useMemo(() => `video-card-${Math.random().toString(36).slice(2)}`, []);

    const resolvedPoster = useMemo(() => sanitizeString(poster), [poster]);
    const resolvedTitle = useMemo(() => sanitizeString(title) || "Video preview", [title]);
    const resolvedDuration = useMemo(() => {
        if (Number.isFinite(durationSeconds) && durationSeconds > 0) return durationSeconds;
        return null;
    }, [durationSeconds]);

    const restorePoster = useCallback(() => {
        const player = videoJsPlayerRef.current;
        if (!player) return;

        try {
            player.pause();
            player.currentTime(0);
        } catch {
            // ignore
        }

        if (resolvedPoster) {
            try {
                player.poster(resolvedPoster);
            } catch {
                // ignore poster errors
            }
            if (player.posterImage?.show) player.posterImage.show();
        }

        if (typeof player.removeClass === "function") {
            player.removeClass("vjs-has-started");
        }
    }, [resolvedPoster]);


    const interactivePreview = typeof onPreviewClick === "function";

    const handleInteraction = useCallback(
        (event) => {
            event?.preventDefault?.();
            event?.stopPropagation?.();

            restorePoster();

            if (interactivePreview) {
                try {
                    onPreviewClick();
                } catch {
                    // ignore preview errors
                }
            }

            openSmartLink();
        },
        [interactivePreview, onPreviewClick, restorePoster]

    );

    useEffect(() => {
        const videoElement = videoElementRef.current;
        if (!videoElement || !resolvedPoster) {
            return () => {};
        }

        const player = videojs(videoElement, DEFAULT_VIDEOJS_OPTIONS);


        videoJsPlayerRef.current = player;

        const readyHandler = () => {
            try {
                player.poster(resolvedPoster);
            } catch {
                // ignore poster errors
            }

            player.addClass("vjs-keep-controls");
            player.userActive(true);
            player.on("userinactive", () => player.userActive(true));

            if (resolvedDuration !== null) {
                const forcedDuration = resolvedDuration;
                player.duration = () => forcedDuration;
                player.trigger("durationchange");
            }
        };

        if (typeof player.ready === "function") {
            player.ready(readyHandler);
        } else {
            readyHandler();
        }

        const redirectHandler = (event) => {
            event?.preventDefault?.();
            handleInteraction(event);
        };

        const playHandler = (event) => {
            event?.preventDefault?.();
            redirectHandler(event);
        };

        player.on("play", playHandler);
        player.on("click", redirectHandler);
        player.on("touchstart", redirectHandler);
        player.on("pointerdown", redirectHandler);

        return () => {
            player.off("play", playHandler);
            player.off("click", redirectHandler);
            player.off("touchstart", redirectHandler);
            player.off("pointerdown", redirectHandler);
            player.dispose();
            videoJsPlayerRef.current = null;
        };
    }, [handleInteraction, resolvedDuration, resolvedPoster]);

    const shouldShowFallback = !resolvedPoster;

    const handleFallbackClick = shouldShowFallback ? handleInteraction : undefined;

    const showPlayOverlay = !shouldShowFallback;


    return (
        <div
            className={clsx(
                "relative overflow-hidden rounded-3xl ring-1 ring-slate-800/70 shadow-[0_25px_60px_-35px_rgba(30,41,59,0.8)]",
                aspect
            )}
            onClickCapture={handleFallbackClick}
        >
            {shouldShowFallback ? (
                <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,_#6366f1_0%,_#0f172a_70%)] text-sm font-semibold text-slate-100">
                    이미지를 불러오지 못했어요
                </div>
            ) : (
                <VideoPreviewPlayer

                    videoId={videoJsId}
                    ref={videoElementRef}
                    poster={resolvedPoster}
                    title={resolvedTitle}
                />
            )}
            {showPlayOverlay && (
                <button
                    type="button"
                    onClick={handleInteraction}
                    className="group absolute inset-0 flex items-center justify-center"
                    aria-label="재생"
                >
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-white transition group-hover:bg-black/80">
                        <svg aria-hidden="true" className="h-6 w-6 fill-current" viewBox="0 0 24 24" focusable="false">
                            <path d="M8 5.14v13.72L19 12 8 5.14z" />
                        </svg>
                    </span>
                </button>
            )}

        </div>
    );
}
