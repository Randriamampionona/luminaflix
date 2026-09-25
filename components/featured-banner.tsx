import { Play, Star } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { tmdbImage } from "@/lib/media";
import { type as typo } from "@/lib/typography";
import { cn } from "@/lib/utils";
import type { Movie } from "@/typing";
import MovieDetails from "./movie-details";

export default async function FeaturedBanner({ movie }: { movie: Movie }) {
  const t = await getTranslations("home");
  const backdrop = tmdbImage(movie.backdrop_path);

  return (
    <section className="py-10 sm:py-14">
      <Container>
        <div className="group relative min-h-75 w-full overflow-hidden rounded-xl border border-white/10 md:min-h-100">
          {backdrop && (
            <Image
              src={backdrop}
              alt=""
              fill
              sizes="(min-width: 1280px) 1216px, 100vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          )}
          <div className="absolute inset-0 bg-linear-to-r from-black via-black/60 to-transparent" />

          <div className="relative flex min-h-75 max-w-2xl flex-col justify-center space-y-4 p-6 sm:p-8 md:min-h-100 md:p-12">
            <div className="flex items-center gap-3">
              <span className="rounded bg-cyan-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter text-black">
                {t("featuredBadge")}
              </span>
              <span className="flex items-center gap-1 text-xs font-bold text-yellow-400">
                <Star className="h-3 w-3 fill-current" />
                {t("featuredRating", { rating: movie.vote_average.toFixed(1) })}
              </span>
            </div>

            <h2 className={cn(typo.h1)}>
              {movie.title}
              <span className="not-italic text-cyan-500">.</span>
            </h2>

            <p className="line-clamp-2 max-w-lg text-sm leading-relaxed text-zinc-300 md:text-base">
              {movie.overview}
            </p>

            <div className="pt-2">
              <MovieDetails movie={movie}>
                <button
                  type="button"
                  className="flex cursor-pointer items-center gap-2 rounded-full bg-white px-6 py-2.5 text-xs font-bold uppercase text-black shadow-lg transition-colors hover:bg-cyan-500 hover:text-white"
                >
                  <Play className="h-4 w-4 fill-current" />
                  {t("viewDetails")}
                </button>
              </MovieDetails>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
