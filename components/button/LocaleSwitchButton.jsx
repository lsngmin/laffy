import BaseActionButton from "./BaseActionButton";

export default function LocaleSwitchButton({ locale, onSwitch }) {
    return (
        <BaseActionButton
            onClick={onSwitch}
            ariaLabel="Change language"
        >
      <span className="text-[11px] uppercase tracking-[0.3em]">
        {locale === "ko" ? "KO" : "EN"}
      </span>
            <span className="text-[11px] text-slate-500">⇄</span>
        </BaseActionButton>
    );
}
