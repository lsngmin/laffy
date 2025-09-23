import {HeartIcon} from "../icons";
import IconActionButton from "@/components/button/base/IconActionButton";


export default function LikeButton({ liked, onToggle, disabled, t }) {
    return (
        <IconActionButton
            onClick={onToggle}
            active={liked}
            disabled={disabled}
            ariaLabel={liked ? t("actions.liked") : t("actions.like")}
            className={liked ? "ring-pink-400/60" : ""}
        >
            <HeartIcon filled={liked} className="h-4 w-4"/>
        </IconActionButton>
    );
}