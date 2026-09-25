"use client";

import {
  AlertTriangle,
  ChevronDown,
  LayoutGrid,
  Loader2,
  Plus,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { getSeasonEpisodes } from "@/action/get-kdrama-details.action";
import { SectionHeader } from "@/components/layout/page-header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { AnimeEpisode } from "@/typing";
import EpisodeCard from "./episode-card";

/** Episodes rendered per batch — long anime seasons can list 1,000+. */
const BATCH = 24;
const INLINE_SEASONS = 3;

interface Season {
  id: number;
  season_number: number;
}

/**
 * BUG FIXES / PERF:
 * - Rapid season clicks could resolve out of order and show the wrong season
 *   (no request tracking). Each request now has an id; stale ones are ignored.
 * - A failed request left the spinner forever (no try/finally).
 * - Seasons with hundreds of episodes rendered every card at once. Cards are
 *   now rendered in batches of 24 as the user scrolls (IntersectionObserver),
 *   keeping the DOM small.
 */
export default function EpisodeExplorer({
  seriesId,
  initialEpisodes,
  seasons,
  path,
}: {
  seriesId: string;
  initialEpisodes: AnimeEpisode[];
  seasons: Season[];
  path: "anime" | "k-drama";
}) {
  const t = useTranslations("episodes");
  const tc = useTranslations("common");
  const validSeasons = seasons.filter((season) => season.season_number > 0);
  const firstSeason = validSeasons[0]?.season_number ?? 1;

  const [activeSeason, setActiveSeason] = useState(firstSeason);
  const [episodes, setEpisodes] = useState(initialEpisodes);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [visible, setVisible] = useState(BATCH);
  const requestId = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadSeason = async (season: number) => {
    const id = ++requestId.current;
    setActiveSeason(season);
    setStatus("loading");
    try {
      const data = await getSeasonEpisodes(seriesId, season);
      if (id !== requestId.current) return; // a newer request superseded this one
      setEpisodes(data);
      setVisible(BATCH);
      setStatus("idle");
    } catch {
      if (id === requestId.current) setStatus("error");
    }
  };

  const handleSeasonChange = (season: number) => {
    if (season !== activeSeason || status === "error") void loadSeason(season);
  };

  // Incremental rendering: reveal the next batch when the sentinel is near.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || visible >= episodes.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting)
          setVisible((count) => Math.min(count + BATCH, episodes.length));
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visible, episodes.length]);

  const inlineSeasons = validSeasons.slice(0, INLINE_SEASONS);
  const overflowSeasons = validSeasons.slice(INLINE_SEASONS);

  return (
    <section className="space-y-10" aria-labelledby="episodes-heading">
      <div className="flex flex-col justify-between gap-6 border-b border-white/5 pb-6 md:flex-row md:items-end">
        <div className="space-y-2">
          <SectionHeader id="episodes-heading" title={t("title")} />
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-cyan-500"
            />
            {t("seasonActive", {
              season: String(activeSeason).padStart(2, "0"),
            })}
          </p>
        </div>

        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label={t("title")}
        >
          {inlineSeasons.map((season) => (
            <button
              key={season.id}
              type="button"
              aria-pressed={activeSeason === season.season_number}
              aria-label={t("seasonLong", { season: season.season_number })}
              onClick={() => handleSeasonChange(season.season_number)}
              className={cn(
                "h-10 rounded-xl border px-5 text-[10px] font-black uppercase tracking-widest transition-colors duration-300",
                activeSeason === season.season_number
                  ? "border-cyan-400 bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                  : "border-white/5 bg-zinc-900/40 text-zinc-500 hover:border-white/20 hover:text-white",
              )}
            >
              {t("seasonShort", { season: season.season_number })}
            </button>
          ))}

          {overflowSeasons.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-10 items-center gap-2 rounded-xl border border-white/5 bg-zinc-900/40 px-4 text-[10px] font-black uppercase text-zinc-400 outline-none transition-colors hover:border-cyan-500/30 hover:text-white">
                <Plus className="h-3 w-3" />
                {t("moreSeasons")}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="max-h-64 min-w-30 rounded-2xl border-white/10 bg-[#050505] p-1 shadow-2xl backdrop-blur-3xl"
              >
                {overflowSeasons.map((season) => (
                  <DropdownMenuItem
                    key={season.id}
                    onSelect={() => handleSeasonChange(season.season_number)}
                    className={cn(
                      "mb-1 cursor-pointer rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest last:mb-0",
                      activeSeason === season.season_number
                        ? "bg-white text-black"
                        : "text-zinc-400 focus:bg-white focus:text-black",
                    )}
                  >
                    {t("seasonLong", { season: season.season_number })}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div aria-live="polite" aria-busy={status === "loading"}>
        {status === "loading" ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
            <span className="sr-only">
              {t("seasonActive", { season: activeSeason })}
            </span>
          </div>
        ) : status === "error" ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-[3rem] border border-dashed border-red-500/20 py-24 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500/70" />
            <p className="text-sm font-bold text-zinc-400">{t("loadError")}</p>
            <button
              type="button"
              onClick={() => void loadSeason(activeSeason)}
              className="rounded-xl bg-white px-6 py-3 text-[10px] font-black uppercase tracking-widest text-black hover:bg-cyan-500"
            >
              {tc("retry")}
            </button>
          </div>
        ) : episodes.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 media-grid">
              {episodes.slice(0, visible).map((episode) => (
                <EpisodeCard
                  key={episode.id}
                  ep={episode}
                  seriesId={seriesId}
                  seasonNumber={activeSeason}
                  path={path}
                />
              ))}
            </div>
            {visible < episodes.length && (
              <div
                ref={sentinelRef}
                className="flex flex-col items-center gap-3 pt-10"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                  {t("showing", { shown: visible, total: episodes.length })}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setVisible((count) =>
                      Math.min(count + BATCH, episodes.length),
                    )
                  }
                  className="rounded-xl border border-white/10 bg-zinc-900 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition-colors hover:border-cyan-500/50 hover:text-white"
                >
                  {t("loadMore")}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-[3rem] border border-dashed border-white/5 bg-zinc-900/5 py-32">
            <LayoutGrid className="mb-4 h-8 w-8 text-zinc-800" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">
              {t("empty")}
            </h3>
            <p className="mt-2 text-[10px] font-bold uppercase text-zinc-700">
              {t("emptyBody", { season: activeSeason })}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
