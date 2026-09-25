"use client";

import { Calendar, Film, Play, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getDisplayTitle,
  getReleaseYear,
  getTrailerHref,
  getWatchHref,
  tmdbImage,
  type MediaKind,
} from "@/lib/media";
import type { Movie } from "@/typing";

type OpenDetails = (movie: Movie, kind: MediaKind) => void;

const MediaDetailsContext = createContext<OpenDetails | null>(null);

/**
 * PERF: every card used to mount its own Radix <Dialog>. A 20-card grid meant
 * 20 dialog roots and triggers; a home page with four rows meant ~60. There is
 * now exactly one dialog, opened through context.
 */
export function MediaDetailsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ movie: Movie; kind: MediaKind } | null>(null);
  const [open, setOpen] = useState(false);

  const openDetails = useCallback<OpenDetails>((movie, kind) => {
    setState({ movie, kind });
    setOpen(true);
  }, []);

  return (
    <MediaDetailsContext.Provider value={openDetails}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        {state && <DetailsContent movie={state.movie} kind={state.kind} onNavigate={() => setOpen(false)} />}
      </Dialog>
    </MediaDetailsContext.Provider>
  );
}

export function useMediaDetails(): OpenDetails {
  const context = useContext(MediaDetailsContext);
  if (!context) throw new Error("useMediaDetails must be used inside <MediaDetailsProvider>");
  return context;
}

function DetailsContent({
  movie,
  kind,
  onNavigate,
}: {
  movie: Movie;
  kind: MediaKind;
  onNavigate: () => void;
}) {
  const t = useTranslations("media");
  const title = getDisplayTitle(movie);
  const year = getReleaseYear(movie);
  const poster = tmdbImage(movie.poster_path);

  const { playHref, trailerHref } = useMemo(
    () => ({
      playHref: getWatchHref(movie.id, kind, title),
      trailerHref: getTrailerHref(movie.id, kind, title),
    }),
    [movie.id, kind, title],
  );

  const label = kind === "tv" ? t("series") : kind === "anime" ? t("anime") : t("movie");

  return (
    <DialogContent className="z-100 max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden rounded-[2rem] border-white/5 bg-zinc-950/95 p-0 text-white backdrop-blur-2xl no-scrollbar sm:max-w-175">
      <div className="relative grid min-h-137.5 grid-cols-1 gap-8 p-6 md:min-h-0 md:grid-cols-2">
        {/* Poster: background on mobile, column on desktop */}
        <div className="group absolute inset-0 aspect-2/3 overflow-hidden rounded-2xl border border-white/10 shadow-[0_0_40px_rgba(6,182,212,0.15)] md:relative md:inset-auto">
          {poster ? (
            <Image
              src={poster}
              alt=""
              fill
              sizes="(min-width: 768px) 330px, 100vw"
              className="object-cover transition-transform duration-700 md:group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full bg-zinc-900" />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black via-black/90 to-black/20 md:hidden" />
          <div className="absolute inset-0 hidden items-center justify-center bg-black/40 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100 md:flex">
            <Link
              href={playHref}
              onClick={onNavigate}
              aria-label={t("play", { title })}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-transform active:scale-90"
            >
              <Play className="ml-1 h-8 w-8 fill-current text-black" />
            </Link>
          </div>
        </div>

        <div className="relative z-10 flex flex-col justify-end py-4 md:justify-between">
          <div>
            <DialogHeader className="text-left">
              <p className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-zinc-300 md:text-zinc-500">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                {label}
              </p>
              <DialogTitle className="mb-4 line-clamp-3 text-4xl font-black uppercase italic leading-none tracking-tighter">
                {title}
                <span className="not-italic text-cyan-500">.</span>
              </DialogTitle>
            </DialogHeader>

            <div className="mb-6 flex items-center gap-4">
              <div className="flex items-center gap-1 rounded-full border border-cyan-400/20 bg-cyan-400/20 px-3 py-1 text-sm font-black text-cyan-400 backdrop-blur-md md:bg-cyan-400/10">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span className="sr-only">{t("rating")}: </span>
                {(movie.vote_average ?? 0).toFixed(1)}
              </div>
              {year && (
                <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-zinc-200 md:text-zinc-400">
                  <Calendar className="h-3.5 w-3.5" />
                  {year}
                </div>
              )}
            </div>

            <DialogDescription className="mb-8 max-h-36 overflow-y-auto pr-2 text-sm italic leading-relaxed text-zinc-200 md:text-zinc-400">
              {movie.overview}
            </DialogDescription>
          </div>

          <div className="space-y-4">
            <Link
              href={trailerHref}
              onClick={onNavigate}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/80 py-4 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md transition-colors hover:bg-zinc-800 md:bg-zinc-900"
            >
              <Film className="h-4 w-4 text-cyan-500" />
              {t("watchTrailer")}
            </Link>
            <Link
              href={playHref}
              onClick={onNavigate}
              className="group flex w-full items-center justify-center gap-3 rounded-2xl border border-transparent bg-white py-4 text-xs font-black uppercase tracking-widest text-black shadow-xl transition-colors hover:border-white/20 hover:bg-cyan-500 hover:text-white"
            >
              <Play className="h-4 w-4 fill-current transition-transform group-hover:scale-110" />
              {kind === "movie" ? t("startWatching") : t("exploreEpisodes")}
            </Link>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}
