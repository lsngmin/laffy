import IconActionButton from "./base/IconActionButton";
import {ShareIcon} from "../icons";


export function ShareButton({ onShare, t }) {
    return (
        <IconActionButton
            onClick={onShare}
            ariaLabel={t("actions.share")}
        >
            <ShareIcon className="h-4 w-4" />
        </IconActionButton>
    );
}
