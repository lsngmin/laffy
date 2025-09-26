import Link from "next/link";
import { BookmarkIcon } from "../icons";

export default function BookmarkLink({ href = "/x", label }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-3.5 py-2 font-semibold text-slate-100 shadow-md shadow-black/40 transition active:scale-95"
      aria-label={label}
    >
      <BookmarkIcon className="h-4 w-4" />
    </Link>
  );
}
