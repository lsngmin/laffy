import IconActionButton from "@/components/button/base/IconActionButton";
import {ShareIcon} from "@/components/icons";

function buildShareUrl(slug) {
    if (typeof window === "undefined") return "";
    if (!slug) return window.location.href;
    try {
        const base = window.location.origin;
        return `${base}/m/${slug}`;
    } catch {
        return window.location.href;
    }
}

export default function ShareButton({ t, title, slug }) {
    const handleShare = async () => {
        if (typeof window === "undefined") return;

        const shareTitle = title || (typeof document !== "undefined" ? document.title : "");
        const shareUrl = buildShareUrl(slug);
        const payload = {
            title: shareTitle,
            url: shareUrl,
        };

        if (navigator.share) {
            try {
                await navigator.share(payload);
                return;
            } catch (error) {
                if (error?.name === "AbortError") return;
                console.warn("Share dismissed", error);
            }
        }

        const text = encodeURIComponent(shareTitle);
        const urlParam = encodeURIComponent(shareUrl);
        const shareIntent = `https://twitter.com/intent/tweet?url=${urlParam}${text ? `&text=${text}` : ""}`;
        const newWindow = window.open(shareIntent, "_blank", "noopener,noreferrer");
        if (!newWindow) {
            window.alert?.(t("shareFallback"));
        }
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
