import IconActionButton from "./base/IconActionButton";
import {BookmarkIcon} from "../icons";

export function BookmarkButton({ isFavorite, onToggle, t }) {
    return (
        <IconActionButton
            onClick={onToggle}
            active={isFavorite}
            ariaLabel={isFavorite ? t("favorites.saved") : t("favorites.save")}
            className={isFavorite ? "ring-amber-300/70" : ""}
        >
            <BookmarkIcon className="h-4 w-4" />
        </IconActionButton>
    );
}