import Link from "next/link";
import { ChevronLeft, Clapperboard, Info } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { SeriesDetails } from "@/action/get-kdrama-details.action";
import AdWrapper from "@/components/ads/ad-wrapper";
import NativeBannerAd from "@/components/ads/native-banner-ad";
import { EmptyState } from "@/components/layout/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import StreamPlayer from "@/components/player/stream-player";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";
import type { AnimeEpisode } from "@/typing";

const pad = (n: number) => String(n).padStart(2, "0");

/** Parses `?s=` / `?e=` (positive integers, defaults to 1). */
export function parseEpisodeParams(s?: string, e?: string) {
  const toInt = (v?: string) => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) && n >= 0 ? n : 1;
  };
  return { season: toInt(s) || 1, episode: toInt(e) || 1 };
}

/** Shared anime / series watch page. */
export default async function EpisodePlayView({
  series,
  episodes,
  season,
  episode,
  path,
}: {
  series: SeriesDetails | null;
  episodes: AnimeEpisode[];
  season: number;
  episode: number;
  path: "anime" | "k-drama";
}) {
  const t = await getTranslations("details");

  if (!series) {
    return (
      <PageShell>
        <EmptyState title={t("notFound")} />
      </PageShell>
    );
  }

  const current = episodes.find((ep) => ep.episode_number === episode);
  const episodeTitle = current?.name || t("episodeFallback", { number: episode });

  return (
    <PageShell>
      <header className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="min-w-0 space-y-6">
          <Link
            href={`/${path}/${series.id}`}
            className="group inline-flex items-center gap-2 text-zinc-500 transition-colors hover:text-white"
          >
            <span className="rounded-full bg-zinc-900 p-2 transition-colors group-hover:bg-cyan-500 group-hover:text-black">
              <ChevronLeft className="h-4 w-4" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t("backToSeries")}</span>
          </Link>

          <div className="space-y-3">
            <p className={type.eyebrow}>{t("nowStreaming")}</p>
            <h1 className={cn(type.h1, "wrap-break-word")}>
              {series.name}
              <span className="text-cyan-500 not-italic">.</span>
            </h1>
            <p className="flex items-center gap-3 pt-1">
              <Clapperboard className="h-4 w-4 shrink-0 text-zinc-600" aria-hidden />
              <span className="text-lg font-bold uppercase italic tracking-tight text-zinc-400 md:text-xl">
                {episodeTitle}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start rounded-2xl border border-white/5 bg-zinc-900/50 px-4 py-2 md:self-end">
          <div className="flex flex-col">
            <span className="text-xs font-black leading-none text-white">S{pad(season)}</span>
            <span className="text-[8px] font-bold uppercase text-zinc-500">{t("season")}</span>
          </div>
          <span aria-hidden className="h-6 w-px bg-white/10" />
          <div className="flex flex-col">
            <span className="text-xs font-black leading-none text-cyan-500">E{pad(episode)}</span>
            <span className="text-[8px] font-bold uppercase text-zinc-500">{t("episode")}</span>
          </div>
        </div>
      </header>

      <StreamPlayer
        kind={path === "anime" ? "anime" : "drama"}
        mediaId={String(series.id)}
        season={season}
        episode={episode}
        posterPath={series.poster_path}
        backdropPath={current?.still_path || series.backdrop_path}
        title={series.name}
      />

      <section className="flex items-start gap-6 rounded-[2.5rem] border border-white/5 bg-zinc-900/20 p-6 backdrop-blur-sm sm:p-8">
        <div className="hidden rounded-2xl bg-cyan-500 p-4 shadow-[0_0_20px_rgba(6,182,212,0.4)] sm:block">
          <Info className="h-6 w-6 text-black" />
        </div>
        <div className="space-y-2">
          <h2 className={type.h3}>{t("streamInfoTitle")}</h2>
          <p className={type.body}>{t("streamInfoBody", { title: series.name, episode: episodeTitle })}</p>
          <p className={type.meta}>{t("subtitlesNote")}</p>
        </div>
      </section>

      <AdWrapper>
        <NativeBannerAd />
      </AdWrapper>
    </PageShell>
  );
}
