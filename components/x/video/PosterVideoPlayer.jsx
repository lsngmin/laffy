import { forwardRef } from "react";
import clsx from "clsx";

const PosterVideoPlayer = forwardRef(function PosterVideoPlayer(
    { videoId, poster, title, className },
    ref
) {
    return (
        <video
            id={videoId}
            ref={ref}
            className={clsx("video-js vjs-default-skin h-full w-full object-cover", className)}
            playsInline
            controls={false}
            preload="metadata"
            poster={poster || undefined}
            data-setup="{}"
            aria-label={title || "Video preview"}
        />
    );
});

export default PosterVideoPlayer;
