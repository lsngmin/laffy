import IconActionButton from "./base/IconActionButton";
import {ShareIcon} from "../icons";


export function ShareButton({ t }) {
    const handleShare = async () => {
        if (typeof window === 'undefined') return;
        const payload = { title: meme.title, url: window.location.href };

        if (navigator.share) {
            try {
                await navigator.share(payload);
                return;
            } catch (err) {
                if (err?.name === 'AbortError') return;
            }
        }
        const text = encodeURIComponent(meme.title);
        const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${text}`;
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <IconActionButton
            onClick={handleShare}
            ariaLabel={t("actions.share")}
        >
            <ShareIcon className="h-4 w-4" />
        </IconActionButton>
    );
}
