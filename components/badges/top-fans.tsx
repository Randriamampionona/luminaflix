import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Flame, Trophy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { getLeaderboard } from "@/lib/user-stats-server";
import { BadgeEmojis } from "./badge-list";

const MEDALS = ["🥇", "🥈", "🥉"];

/** Home: the 5 most active members (cached 10 min) → /user-rank. */
export default async function TopFans() {
  const [t, top] = await Promise.all([getTranslations("badges"), getLeaderboard(5)]);
  if (top.length === 0) return null;
  return (
    <section className="py-6 sm:py-8" aria-labelledby="home-top-fans">
      <Container>
        <div className="overflow-hidden rounded-3xl border border-line bg-surface/70 p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="home-top-fans" className="flex items-center gap-2 text-sm font-black tracking-tight text-foreground sm:text-base">
              <Trophy className="h-4 w-4 text-amber-500" aria-hidden />
              {t("topFans")}
            </h2>
            <Link
              href="/user-rank"
              className="flex items-center gap-1.5 text-[10px] font-black tracking-widest text-fg-muted uppercase hover:text-brand"
            >
              {t("seeRanking")}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          <ol className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 scrollbar-hide">
            {top.map((u) => (
              <li
                key={u.rank}
                className="flex w-40 shrink-0 snap-start flex-col items-center gap-1.5 rounded-2xl border border-line bg-tint p-3 text-center sm:w-44"
              >
                <span className="relative">
                  {u.imageUrl ? (
                    <Image src={u.imageUrl} alt="" width={48} height={48} className="h-12 w-12 rounded-full object-cover" unoptimized />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/15 text-lg font-black text-brand">
                      {u.name[0]}
                    </span>
                  )}
                  <span className="absolute -top-1 -right-2 text-lg" aria-label={`#${u.rank}`}>
                    {MEDALS[u.rank - 1] ?? `#${u.rank}`}
                  </span>
                </span>
                <span className="w-full truncate text-xs font-black text-foreground">{u.name}</span>
                <span className="flex items-center gap-2 text-[10px] font-bold text-fg-subtle">
                  <span>{t("points", { count: u.points })}</span>
                  {u.streak > 1 && (
                    <span className="flex items-center gap-0.5 text-orange-500">
                      <Flame className="h-3 w-3" aria-hidden />
                      {u.streak}
                    </span>
                  )}
                </span>
                <BadgeEmojis badges={u.badges} max={4} />
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
