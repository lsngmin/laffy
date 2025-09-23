import clsx from 'clsx';

export default function VideoCard({ poster, src, title, aspect, disablePlay = false }) {
    const resolvedPoster = typeof poster === 'string' && poster.trim().length > 0 ? poster : null;

    return (
        <div
            className={clsx(
                'overflow-hidden rounded-3xl ring-1 ring-slate-800/70 shadow-[0_25px_60px_-35px_rgba(30,41,59,0.8)]',
                aspect
            )}
        >
            {disablePlay ? (
                // 단순 썸네일 카드
                <div className="relative">
                    {resolvedPoster ? (
                        <img
                            src={resolvedPoster}
                            alt={title}
                            className="h-full w-full select-none object-cover pointer-events-none"
                            loading="lazy"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-900/80 text-sm text-slate-200">
                            미리보기가 준비되지 않았어요
                        </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-16 w-16 text-white/80 drop-shadow-lg"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </div>
                </div>
            ) : (
                // 실제 동영상 플레이어
                <video
                    className="h-full w-full object-cover"
                    controls
                    preload="metadata"
                    playsInline
                    poster={resolvedPoster || undefined}
                >
                    <source src={src} type="video/mp4" />
                </video>
            )}
        </div>
    );
}
