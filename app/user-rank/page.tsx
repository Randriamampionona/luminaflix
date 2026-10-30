import type { Metadata } from "next";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import { Flame, Medal, Trophy, Tv } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { BadgeEmojis, BadgeGrid } from "@/components/badges/badge-list";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import SignInLink from "@/components/auth/sign-in-link";
import { getLeaderboard, getUserStats } from "@/lib/user-stats-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("badges");
  return { title: t("title"), description: t("description") };
}

const MEDALS = ["🥇", "🥈", "🥉"];

/** /user-rank — leaderboard of the most active members + your own badges and streak. */
export default async function UserRankPage() {
  const userId = await auth()
    .then((session) => session.userId)
    .catch(() => null);
  const [t, board, mine] = await Promise.all([
    getTranslations("badges"),
    getLeaderboard(50),
    userId ? getUserStats(userId) : Promise.resolve(null),
  ]);

  return (
    <PageShell>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      {/* Your profile */}
      <section id="me" className="space-y-4 rounded-3xl border border-line bg-surface/70 p-4 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-black text-foreground">
          <Medal className="h-4 w-4 text-brand" aria-hidden />
          {t("yourProfile")}
        </h2>
        {userId ? (
          <>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[
                { icon: Flame, label: t("streak"), value: t("days", { count: mine?.streak ?? 0 }) },
                { icon: Trophy, label: t("bestStreak"), value: t("days", { count: mine?.bestStreak ?? 0 }) },
                {
                  icon: Tv,
                  label: t("watched"),
                  value: String(
                    (mine?.watched.movie ?? 0) + (mine?.watched.tv ?? 0) + (mine?.watched.kdrama ?? 0) + (mine?.watched.anime ?? 0),
                  ),
                },
                { icon: Medal, label: t("pointsLabel"), value: String(mine?.points ?? 0) },
              ].map((k) => (
                <div key={k.label} className="rounded-2xl border border-line bg-tint p-3">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-fg-subtle uppercase">
                    <k.icon className="h-3.5 w-3.5" aria-hidden />
                    {k.label}
                  </p>
                  <p className="mt-1 text-xl font-black text-foreground">{k.value}</p>
                </div>
              ))}
            </div>
            <BadgeGrid earned={mine?.badges ?? []} />
            {!mine && <p className="text-xs text-fg-subtle">{t("startHint")}</p>}
          </>
        ) : (
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-fg-muted">{t("signInHint")}</p>
            <SignInLink
              route="/sign-up"
              className="rounded-2xl bg-cyan-500 px-5 py-3 text-[11px] font-black tracking-widest text-black uppercase hover:bg-cyan-400"
            >
              {t("signUp")}
            </SignInLink>
          </div>
        )}
      </section>

      {/* Leaderboard */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-black text-foreground">
          <Trophy className="h-4 w-4 text-amber-500" aria-hidden />
          {t("leaderboard")}
        </h2>
        {board.length === 0 ? (
          <p className="rounded-3xl border border-line bg-tint p-8 text-center text-sm text-fg-subtle">{t("empty")}</p>
        ) : (
          <ol className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface/70">
            {board.map((u) => (
              <li key={u.rank} className="flex items-center gap-3 px-3 py-3 sm:px-5">
                <span className="w-8 shrink-0 text-center text-sm font-black text-fg-muted">
                  {MEDALS[u.rank - 1] ?? u.rank}
                </span>
                {u.imageUrl ? (
                  <Image src={u.imageUrl} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-full object-cover" unoptimized />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 font-black text-brand">
                    {u.name[0]}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-foreground">{u.name}</span>
                  <BadgeEmojis badges={u.badges} />
                </span>
                {u.streak > 1 && (
                  <span className="hidden items-center gap-1 text-xs font-bold text-orange-500 sm:flex">
                    <Flame className="h-3.5 w-3.5" aria-hidden />
                    {u.streak}
                  </span>
                )}
                <span className="shrink-0 rounded-full bg-cyan-500/10 px-2.5 py-1 text-xs font-black text-brand">
                  {t("points", { count: u.points })}
                </span>
              </li>
            ))}
          </ol>
        )}
        <p className="text-[11px] text-fg-subtle">{t("privacyNote")}</p>
      </section>
    </PageShell>
  );
}
