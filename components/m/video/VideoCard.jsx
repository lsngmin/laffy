import { useRef, useState } from "react";
import clsx from "clsx";

export default function VideoCard({
                                      poster,
                                      src,
                                      title,
                                      aspect,
                                      disablePlay = false,
                                  }) {
    const vRef = useRef(null);
    const [overlay, setOverlay] = useState(true);

    const play = async () => {
        if (disablePlay) return; // true면 무시
        try {
            await vRef.current?.play();
            setOverlay(false);
        } catch {
            setOverlay(false);
        }
    };

    const resolvedPoster =
        typeof poster === "string" && poster.trim().length > 0 ? poster : null;

    return (
        <div
            className={clsx(
                "relative overflow-hidden rounded-3xl ring-1 ring-slate-800/70 shadow-[0_25px_60px_-35px_rgba(30,41,59,0.8)]",
                aspect
            )}
        >
            {disablePlay ? (
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
                    onClick={disablePlay ? undefined : play}
                    className={clsx(
                        "absolute inset-0 grid place-items-center transition",
                        disablePlay
                            ? "cursor-default bg-black/20"
                            : "hover:bg-black/10 cursor-pointer"
                    )}
                >
                    <div className="flex flex-col items-center gap-2 pointer-events-none">
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
                            <span className="text-white/90 text-sm font-semibold">
                {title}
              </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
