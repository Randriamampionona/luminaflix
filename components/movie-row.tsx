"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { memo, useCallback, useRef } from "react";
import { SectionHeader } from "@/components/layout/page-header";
import { Container } from "@/components/layout/container";
import { inferMediaKind, type MediaKind } from "@/lib/media";
import type { Movie } from "@/typing";
import MovieCard from "./movie-card";

const ROW_POSTER_SIZES = "(min-width: 768px) 200px, 150px";

interface MovieRowProps {
  title: string;
  movies: Movie[];
  /** Force a route kind; otherwise inferred per item (movie vs series). */
  type?: MediaKind;
  /** Prioritise the first posters (use for the first row below the hero). */
  priority?: boolean;
}

function MovieRow({ title, movies, type, priority = false }: MovieRowProps) {
  const t = useTranslations("common");
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback((direction: -1 | 1) => {
    const row = rowRef.current;
    if (!row) return;
    row.scrollBy({ left: direction * row.clientWidth * 0.9, behavior: "smooth" });
  }, []);

  if (movies.length === 0) return null;

  return (
    <section className="py-6 sm:py-8" aria-label={title}>
      <Container className="space-y-5">
        <SectionHeader
          title={title}
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scroll(-1)}
                aria-label={t("scrollLeft")}
                className="rounded-full border border-white/5 bg-zinc-900 p-2 text-white transition-colors hover:bg-cyan-500 hover:text-black"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scroll(1)}
                aria-label={t("scrollRight")}
                className="rounded-full border border-white/5 bg-zinc-900 p-2 text-white transition-colors hover:bg-cyan-500 hover:text-black"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          }
        />

        <div
          ref={rowRef}
          className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-4 scrollbar-hide"
        >
          {movies.map((movie, index) => (
            <div key={movie.id} className="w-37.5 shrink-0 snap-start md:w-50">
              <MovieCard
                movie={movie}
                type={type ?? inferMediaKind(movie)}
                sizes={ROW_POSTER_SIZES}
                priority={priority && index < 6}
              />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

export default memo(MovieRow);
