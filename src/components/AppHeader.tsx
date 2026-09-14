import Link from "next/link";
import { BrandMark } from "./BrandMark";

type AppHeaderProps = {
  favouriteCount: number;
  current: "home" | "saved";
};

export function AppHeader({ favouriteCount, current }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <BrandMark />
          <span className="min-w-0">
            <span className="block font-display text-[1.35rem] leading-none tracking-wide text-cream">
              Today&apos;s Session
            </span>
            <span className="mt-0.5 block truncate text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
              Supps n Social
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className={`rounded-full px-3 py-2 text-sm font-semibold ${
              current === "home" ? "bg-panel-2 text-cream" : "text-muted"
            }`}
          >
            Roll
          </Link>
          <Link
            href="/favourites"
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold ${
              current === "saved" ? "bg-panel-2 text-cream" : "text-muted"
            }`}
          >
            Saved
            {favouriteCount > 0 ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-lime px-1.5 text-[11px] font-bold text-lime-ink">
                {favouriteCount}
              </span>
            ) : null}
          </Link>
        </nav>
      </div>
    </header>
  );
}
