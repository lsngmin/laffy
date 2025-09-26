import { forwardRef } from "react";
import clsx from "clsx";

const DEFAULT_VIDEO_CLASSNAME = "video-js vjs-default-skin h-full w-full object-cover";

const VideoPreviewPlayer = forwardRef(function VideoPreviewPlayer(
    { videoId, poster, title, className },
    ref
) {
    return (
        <video
            id={videoId}
            ref={ref}
            className={clsx(DEFAULT_VIDEO_CLASSNAME, className)}
            playsInline
            controls={false}
            preload="metadata"
            poster={poster || undefined}
            data-setup="{}"
            aria-label={title || "Video preview"}
        />
    );
});

export default VideoPreviewPlayer;
export { DEFAULT_VIDEO_CLASSNAME };
