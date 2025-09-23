import Link from "next/link";
import clsx from "clsx";

export default function BackToFeedLink({
                                       href = "/",
                                       label = "Back",
                                       icon = "←",
                                       className,
                                   }) {
    return (
        <Link
            href={href}
            className={clsx(
                "inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500/40 via-purple-500/30 to-pink-500/40 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-black/50 transition hover:brightness-110 active:scale-95",
                className
            )}
        >
            <span aria-hidden="true">{icon}</span>
            {label}
        </Link>
    );
}
