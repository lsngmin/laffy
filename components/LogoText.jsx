import clsx from "clsx";

export default function LogoText({
                                     text = "LAFFY",
                                     size = "2xl", // tailwind text size: sm, base, lg, xl, 2xl, 3xl ...
                                     className,
                                 }) {
    return (
        <span
            className={clsx(
                "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text font-black tracking-[0.35em] text-transparent",
                `text-${size}`,
                className
            )}
        >
      {text}
    </span>
    );
}
