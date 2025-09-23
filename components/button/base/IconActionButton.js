import clsx from "clsx";

export default function IconActionButton({
                                             onClick,
                                             active = false,
                                             disabled = false,
                                             ariaLabel,
                                             children,
                                             size = "md", // "sm" | "md" | "lg"
                                             className,
                                         }) {
    const sizeClasses = {
        sm: "px-2.5 py-1 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-5 py-3 text-base",
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-pressed={active}
            aria-label={ariaLabel}
            className={clsx(
                "inline-flex items-center justify-center rounded-full bg-slate-900/80 font-semibold text-slate-100 shadow-lg shadow-black/40 transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400",
                sizeClasses[size],
                active && "ring-1",
                className
            )}
        >
            {children}
        </button>
    );
}
