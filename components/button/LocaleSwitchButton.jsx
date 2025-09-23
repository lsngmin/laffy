import IconActionButton from "./base/IconActionButton";

export default function LocaleSwitchButton({ locale, onSwitch }) {
    return (
        <IconActionButton
            onClick={onSwitch}
            ariaLabel="Change language"
        >
      <span className="text-[11px] uppercase tracking-[0.3em]">
        {locale === "ko" ? "KO" : "EN"}
      </span>
            <span className="text-[11px] text-slate-500">⇄</span>
        </IconActionButton>
    );
}
