import { useCallback, useEffect, useMemo, useRef } from "react";
import clsx from "clsx";
import videojs from "video.js";
import "video.js/dist/video-js.css";

import PosterVideoPlayer from "./PosterVideoPlayer";

const SMART_LINK = "https://relishsubsequentlytank.com/m4dat49uw?key=5c0b078a04533db894c7b305e5dd7a67";

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

    const openSmartLink = useCallback(() => {
        try {
            window.location.href = SMART_LINK;
        } catch {
            // ignore navigation issues
        }
    }, []);

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
        [interactivePreview, onPreviewClick, openSmartLink, restorePoster]
    );

    useEffect(() => {
        const videoElement = videoElementRef.current;
        if (!videoElement || !resolvedPoster) {
            return () => {};
        }

        const player = videojs(videoElement, {
            controls: false,
            bigPlayButton: true,
            preload: "metadata",
            autoplay: false,
        });

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
                <PosterVideoPlayer
                    videoId={videoJsId}
                    ref={videoElementRef}
                    poster={resolvedPoster}
                    title={resolvedTitle}
                />
            )}
        </div>
    );
}
