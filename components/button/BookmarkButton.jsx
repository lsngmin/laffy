import IconActionButton from "./base/IconActionButton";
import {BookmarkIcon} from "../icons";

const SMART_URL = 'https://otieu.com/4/9924601';

export default function BookmarkButton({ isFavorite, onToggle, t }) {
    const handleClick = () => {
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
