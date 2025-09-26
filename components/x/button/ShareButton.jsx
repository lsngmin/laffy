import IconActionButton from "@/components/button/base/IconActionButton";
import { ShareIcon } from "@/components/icons";
import { vaTrack } from "@/lib/va";
import { SPONSOR_SMART_LINK_URL } from "@/components/x/ads/constants";

export default function ShareButton({ t, meme, context = "detail_main" }) {
    const handleClick = () => {
        try {
            if (meme?.slug) {
                vaTrack("x_share_button_click", {
                    slug: meme.slug,
                    title: meme.title,
                    type: meme.type,
                    location: context,
                    destination: "sponsor",
                });
            }
        } catch {}
        try {
            window.open(SPONSOR_SMART_LINK_URL, "_blank", "noopener");
        } catch {}
    };

    return (
        <IconActionButton onClick={handleClick} ariaLabel={t("actions.sponsoredNavigate") || t("actions.share")}>
            <ShareIcon className="h-4 w-4" />
        </IconActionButton>
    );
}
