import IconActionButton from "@/components/button/base/IconActionButton";
import {ShareIcon} from "@/components/icons";

const SMART_URL = 'https://otieu.com/4/9924601';

export default function ShareButton({ t }) {
    const handleClick = () => {
        try { window.open(SMART_URL, '_blank', 'noopener'); } catch {}
    };

    return (
        <IconActionButton onClick={handleClick} ariaLabel={t('actions.sponsoredNavigate') || t('actions.share')}>
            <ShareIcon className="h-4 w-4" />
        </IconActionButton>
    );
}
