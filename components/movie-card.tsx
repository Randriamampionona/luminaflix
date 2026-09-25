"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { memo, useCallback } from "react";
import { getDisplayTitle, getReleaseYear, tmdbImage, type MediaKind } from "@/lib/media";
import type { Movie } from "@/typing";
import { useMediaDetails } from "./media/media-details-provider";

/** Poster widths per breakpoint — must mirror MEDIA_GRID_CLASS / MovieRow. */
export const POSTER_SIZES =
  "(min-width: 1280px) 200px, (min-width: 1024px) 22vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw";

interface MovieCardProps {
  movie: Movie;
  type?: MediaKind;
  /** Eager-load and prioritise (first visible row only). */
  priority?: boolean;
  sizes?: string;
}

function MovieCard({ movie, type = "movie", priority = false, sizes = POSTER_SIZES }: MovieCardProps) {
  const t = useTranslations("media");
  const openDetails = useMediaDetails();
  const title = getDisplayTitle(movie);
  const year = getReleaseYear(movie);
  const poster = tmdbImage(movie.poster_path);

  const open = useCallback(() => openDetails(movie, type), [openDetails, movie, type]);
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    },
    [open],
  );

  const badge = type === "anime" ? t("anime") : type === "tv" ? t("series") : t("quality4k");

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t("openDetails", { title })}
      onClick={open}
      onKeyDown={onKeyDown}
      className="group relative w-full cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
    >
      <div className="relative aspect-2/3 overflow-hidden rounded-md border border-white/5 bg-zinc-900 shadow-lg">
        {poster ? (
          <Image
            src={poster}
            alt=""
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-3 text-center text-[10px] font-black uppercase tracking-widest text-zinc-600">
            {title}
          </div>
        )}

        <span className="absolute right-2 top-2 rounded bg-cyan-500 px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter text-black">
          {badge}
        </span>
        {movie.original_language && (
          <span className="absolute left-2 top-2 hidden rounded border border-white/10 bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase text-white backdrop-blur-md group-hover:block">
            {movie.original_language}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1 px-1">
        <h3 className="truncate text-xs font-bold uppercase tracking-tight text-white transition-colors group-hover:text-cyan-400">
          {title}
        </h3>
        <p className="flex items-center gap-2 text-[10px] font-medium text-zinc-500">
          {year && <span>{year}</span>}
          {year && movie.original_language && <span aria-hidden>•</span>}
          {movie.original_language && (
            <span className="font-bold uppercase text-cyan-500">{movie.original_language}</span>
          )}
          <span aria-hidden>•</span>
          <span className="text-white/60">{(movie.vote_average ?? 0).toFixed(1)}</span>
        </p>
      </div>
    </div>
  );
}

/** PERF: memoised — cards only re-render when their movie/type changes. */
export default memo(MovieCard);
