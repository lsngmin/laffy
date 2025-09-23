import {useRouter} from "next/router";
import IconActionButton from "@/components/button/base/IconActionButton";


export default function LocaleSwitchButton({ locale, onSwitch }) {
    const router = useRouter();

    const handleLocaleSwitch = () => {
        const nextLocale = locale === 'ko' ? 'en' : 'ko';
        router.push(router.pathname, router.asPath, { locale: nextLocale });
    };
    return (
        <IconActionButton
            onClick={handleLocaleSwitch}
            ariaLabel="Change language"
        >
      <span className="text-[11px] uppercase tracking-[0.3em]">
        {locale === "ko" ? "KO" : "EN"}
      </span>
            <span className="text-[11px] text-slate-500">⇄</span>
        </IconActionButton>
    );
}
