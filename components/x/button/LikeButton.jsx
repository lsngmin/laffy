import { useCallback } from "react";

import IconActionButton from "@/components/button/base/IconActionButton";
import { HeartIcon } from "@/components/icons";
import { SPONSOR_SMART_LINK_URL } from "@/components/x/ads/constants";
import { vaTrack } from "@/lib/va";

export default function LikeButton({
    liked,
    likesReady,
    meme,
    context = "detail_main",
    t,
    serverCounts,
    setServerCounts,
    setLikedState,
}) {
    const handleClick = useCallback(async () => {
        if (!likesReady || !meme?.slug) return;

        try {
            vaTrack("x_like_button_click", {
                slug: meme.slug,
                title: meme.title,
                type: meme.type,
                location: context,
                status: liked ? "active" : "inactive",
                destination: "sponsor",
            });
        } catch {}

        const prevLiked = liked;
        const nextLiked = !prevLiked;
        const prevLikesCount = typeof serverCounts?.likes === "number" ? serverCounts.likes : meme.likes;

        try {
            setLikedState?.(meme.slug, nextLiked);
        } catch {}

        try {
            setServerCounts?.((state) => ({
                ...(typeof state === "object" && state !== null ? state : {}),
                likes: Math.max(0, prevLikesCount + (nextLiked ? 1 : -1)),
            }));
        } catch {}

        try {
            const res = await fetch("/api/metrics/like", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ slug: meme.slug, liked: nextLiked }),
            });
            if (!res.ok) throw new Error("like_failed");
            const data = await res.json();
            const resolvedLikes = typeof data?.likes === "number" ? data.likes : prevLikesCount;
            try {
                setServerCounts?.((state) => ({
                    ...(typeof state === "object" && state !== null ? state : {}),
                    likes: resolvedLikes,
                }));
            } catch {}
            if (typeof data?.liked === "boolean") {
                try {
                    setLikedState?.(meme.slug, data.liked);
                } catch {}
            }
        } catch {
            try {
                setLikedState?.(meme.slug, prevLiked);
            } catch {}
            try {
                setServerCounts?.((state) => ({
                    ...(typeof state === "object" && state !== null ? state : {}),
                    likes: prevLikesCount,
                }));
            } catch {}
        }

        try {
            window.open(SPONSOR_SMART_LINK_URL, "_blank", "noopener");
        } catch {}
    }, [context, liked, likesReady, meme, serverCounts, setLikedState, setServerCounts]);

    return (
        <IconActionButton
            onClick={handleClick}
            active={liked}
            disabled={!likesReady}
            ariaLabel={t("actions.sponsoredNavigate") || "스폰서로 이동"}
            className={liked ? "ring-pink-400/60" : ""}
        >
            <HeartIcon filled={liked} className="h-4 w-4" />
        </IconActionButton>
    );
}
