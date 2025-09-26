import { useCallback } from "react";

import IconActionButton from "@/components/button/base/IconActionButton";
import { BookmarkIcon } from "@/components/icons";
import { SPONSOR_SMART_LINK_URL } from "@/components/x/ads/constants";
import { vaTrack } from "@/lib/va";
import { toggleFavoriteSlug } from "@/utils/storage";

export default function BookmarkButton({
    isFavorite,
    meme,
    t,
    context = "detail_main",
    setIsFavorite,
}) {
    const handleClick = useCallback(() => {
        if (!meme?.slug) return;

        try {
            vaTrack("x_bookmark_button_click", {
                slug: meme.slug,
                title: meme.title,
                type: meme.type,
                location: context,
                status: isFavorite ? "active" : "inactive",
                destination: "sponsor",
            });
        } catch {}

        try {
            const updated = toggleFavoriteSlug(meme.slug);
            setIsFavorite?.(updated.includes(meme.slug));
        } catch {}

        try {
            window.open(SPONSOR_SMART_LINK_URL, "_blank", "noopener");
        } catch {}
    }, [context, isFavorite, meme, setIsFavorite]);

    return (
        <IconActionButton
            onClick={handleClick}
            active={isFavorite}
            ariaLabel={t("actions.sponsoredNavigate") || "스폰서로 이동"}
            className={isFavorite ? "ring-amber-300/70" : ""}
        >
            <BookmarkIcon className="h-4 w-4" />
        </IconActionButton>
    );
}
