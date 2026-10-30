import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { getComingSoon } from "@/action/get-coming-soon.action";
import FrStatusBadge from "@/components/coming-soon/fr-status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { tmdbImage } from "@/lib/media";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("comingSoon");
  return { title: t("title"), description: t("description") };
}

/** /coming-soon — release calendar with VF / VOSTFR status and "Notify me". */
export default async function ComingSoonPage() {
  const [t, format, locale, movies] = await Promise.all([
    getTranslations("comingSoon"),
    getFormatter(),
    getLocale(),
    getComingSoon(),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  // Group by week (Monday) so the calendar reads well on a phone.
  const groups = new Map<string, typeof movies>();
  for (const m of movies) {
    const d = new Date(`${m.release_date}T12:00:00Z`);
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const key = monday.toISOString().slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }

  return (
    <PageShell>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      {movies.length === 0 && <p className="py-16 text-center text-sm text-fg-subtle">{t("empty")}</p>}
      <div className="space-y-8">
        {[...groups].map(([week, items]) => (
          <section key={week} className="space-y-3">
            <h2 className="sticky top-16 z-10 -mx-4 flex items-center gap-2 bg-background/90 px-4 py-2 text-[11px] font-black tracking-[0.2em] text-fg-muted uppercase backdrop-blur sm:top-20">
              <CalendarDays className="h-3.5 w-3.5 text-brand" aria-hidden />
              {t("weekOf", { date: format.dateTime(new Date(`${week}T12:00:00Z`), { day: "numeric", month: "long" }) })}
            </h2>
            <ul className="grid gap-3 lg:grid-cols-2">
              {items.map((m) => {
                const poster = tmdbImage(m.poster_path);
                const released = (m.release_date ?? "") <= today;
                return (
                  <li key={m.id} className="flex gap-3 rounded-3xl border border-line bg-surface/70 p-3 sm:gap-4 sm:p-4">
                    <Link
                      href={`/trailer/${m.id}?type=movie&lang=${locale}`}
                      className="relative aspect-2/3 w-20 shrink-0 overflow-hidden rounded-xl bg-elevated sm:w-24"
                    >
                      {poster && <Image src={poster} alt="" fill sizes="96px" className="object-cover" />}
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="text-[10px] font-black tracking-widest uppercase">
                        <span className={released ? "text-emerald-600 dark:text-emerald-400" : "text-brand"}>
                          {format.dateTime(new Date(`${m.release_date}T12:00:00Z`), {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                        <span className="ml-2 text-fg-subtle">{released ? t("inCinemas") : t("upcoming")}</span>
                      </p>
                      <Link href={`/movies/${m.id}`} className="mt-1 line-clamp-2 text-sm font-black text-foreground hover:text-brand sm:text-base">
                        {m.title}
                      </Link>
                      {m.overview && <p className="mt-1 line-clamp-2 text-xs text-fg-subtle">{m.overview}</p>}
                      <div className="mt-auto pt-3">
                        <FrStatusBadge id={m.id} title={m.title ?? ""} posterPath={m.poster_path ?? null} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
