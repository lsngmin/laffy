import { HeartIcon } from "../icons";
import IconActionButton from "@/components/button/base/IconActionButton";
import { vaTrack } from "@/lib/va";

const SMART_URL = 'https://otieu.com/4/9924601';

export default function LikeButton({ liked, onToggle, disabled, t, meme, context = 'detail_main' }) {
    const handleClick = () => {
        try {
            if (meme?.slug) {
                vaTrack('x_like_button_click', {
                    slug: meme.slug,
                    title: meme.title,
                    type: meme.type,
                    location: context,
                    status: liked ? 'active' : 'inactive',
                    destination: 'sponsor',
                });
            }
        } catch {}
        try { window.open(SMART_URL, '_blank', 'noopener'); } catch {}
        // 선택: 원래 토글도 유지하려면 아래 주석 해제
        // try { onToggle?.(); } catch {}
    };

    return (
        <IconActionButton
            onClick={handleClick}
            active={liked}
            disabled={disabled}
            ariaLabel={t('actions.sponsoredNavigate') || '스폰서로 이동'}
            className={liked ? "ring-pink-400/60" : ""}
        >
            <HeartIcon filled={liked} className="h-4 w-4" />
        </IconActionButton>
    );
}
