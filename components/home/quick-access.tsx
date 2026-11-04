import Link from "next/link";
import { CalendarClock, Clapperboard, Heart, Layers, Sparkles, Tv, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/container";

const ITEMS: {
  href: string;
  key: "movies" | "tvShows" | "kdrama" | "anime" | "collections" | "comingSoon";
  icon: LucideIcon;
  tone: string;
}[] = [
  { href: "/movies", key: "movies", icon: Clapperboard, tone: "from-cyan-500/25 text-cyan-400" },
  { href: "/tv-shows", key: "tvShows", icon: Tv, tone: "from-sky-500/25 text-sky-400" },
  { href: "/k-drama", key: "kdrama", icon: Heart, tone: "from-purple-500/25 text-purple-400" },
  { href: "/anime", key: "anime", icon: Sparkles, tone: "from-pink-500/25 text-pink-400" },
  { href: "/collections", key: "collections", icon: Layers, tone: "from-amber-500/25 text-amber-400" },
  { href: "/coming-soon", key: "comingSoon", icon: CalendarClock, tone: "from-emerald-500/25 text-emerald-400" },
];

/** Shortcuts under the hero: the app's sections at a glance (3 × 2 on phones, one row on desktop). */
export default async function QuickAccess() {
  const t = await getTranslations("nav");
  return (
    <nav aria-label={t("mainNavigation")} className="relative z-10 -mt-2 pb-2">
      <Container>
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-6 sm:gap-3">
          {ITEMS.map(({ href, key, icon: Icon, tone }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex h-full flex-col items-center gap-2 rounded-2xl border border-line bg-surface/80 px-2 py-3.5 text-center transition-all hover:-translate-y-0.5 hover:border-cyan-500/40 sm:py-4"
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br to-transparent ${tone} transition-transform group-hover:scale-110`}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-[11px] font-black tracking-wide text-foreground uppercase sm:text-xs">
                  {t(key)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </nav>
  );
}
