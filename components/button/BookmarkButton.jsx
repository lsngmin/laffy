import IconActionButton from "./base/IconActionButton";
import { BookmarkIcon } from "../icons";
import { vaTrack } from "@/lib/va";

const SMART_URL = 'https://otieu.com/4/9924601';

export default function BookmarkButton({ isFavorite, onToggle, t, meme, context = 'detail_main' }) {
    const handleClick = () => {
        try {
            if (meme?.slug) {
                vaTrack('detail_bookmark_button_click', {
                    slug: meme.slug,
                    title: meme.title,
                    type: meme.type,
                    location: context,
                    status: isFavorite ? 'active' : 'inactive',
                    destination: 'sponsor',
                });
            }
        } catch {}
        try { window.open(SMART_URL, '_blank', 'noopener'); } catch {}
        // try { onToggle?.(); } catch {}
    };
    return (
        <IconActionButton
            onClick={handleClick}
            active={isFavorite}
            ariaLabel={t('actions.sponsoredNavigate') || '스폰서로 이동'}
            className={isFavorite ? "ring-amber-300/70" : ""}
        >
            <BookmarkIcon className="h-4 w-4" />
        </IconActionButton>
    );
}
