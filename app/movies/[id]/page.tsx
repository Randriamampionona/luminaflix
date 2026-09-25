import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, ArrowRight, Search, Sparkles } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { getFallbackMovie } from "@/action/get-fallback-movies.action";
import { getMovieData } from "@/action/get-movie-data.action";
import { getMediaInteraction } from "@/action/stream-actions";
import AdWrapper from "@/components/ads/ad-wrapper";
import NativeBannerAd from "@/components/ads/native-banner-ad";
import { PageShell } from "@/components/layout/page-shell";
import StreamPlayer from "@/components/player/stream-player";
import { getReleaseYear, tmdbImage } from "@/lib/media";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ fallback?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const movie = await getMovieData(id);
  if (!movie) {
    const t = await getTranslations("media");
    return { title: t("notFoundTitle"), robots: { index: false } };
  }
  const image = tmdbImage(movie.backdrop_path || movie.poster_path);
  return {
    title: movie.title,
    description: movie.overview?.slice(0, 160),
    openGraph: image ? { images: [{ url: image }] } : undefined,
  };
}

export default async function WatchPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ id }, { fallback }] = await Promise.all([params, searchParams]);
  const [movie, t, format] = await Promise.all([getMovieData(id), getTranslations("media"), getFormatter()]);

  if (!movie) {
    const alternatives = fallback ? (await getFallbackMovie(fallback)).slice(0, 6) : [];

    return (
      <PageShell containerClassName="max-w-4xl">
        <div className="space-y-4 text-center">
          <div className="relative mx-auto w-fit">
            <div className="absolute -inset-4 animate-pulse rounded-full bg-red-500/20 blur-2xl" />
            <AlertCircle className="relative h-16 w-16 text-red-500" />
          </div>
          <h1 className={type.h1}>
            {t("notFoundTitle")}
            <span className="text-red-500 not-italic">.</span>
          </h1>
          <p className={cn(type.body, "mx-auto max-w-xl")}>{t("notFoundBody", { id })}</p>
        </div>

        <section className="space-y-8">
          {fallback && (
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <Sparkles className="h-4 w-4 shrink-0 text-cyan-500" />
              <h2 className={cn(type.meta, "min-w-0 wrap-break-word")}>{t("similarTo", { query: fallback })}</h2>
            </div>
          )}

          {alternatives.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {alternatives.map((item) => {
                const image = tmdbImage(item.backdrop_path || item.poster_path);
                const title = item.title || item.name || "";
                return (
                  <Link
                    key={item.id}
                    href={`/movies/${item.id}?fallback=${encodeURIComponent(title.toLowerCase())}`}
                    className="group rounded-4xl border border-white/5 bg-zinc-900/40 p-4 transition-all hover:scale-[1.02] hover:bg-zinc-800/60"
                  >
                    <div className="relative mb-4 aspect-video overflow-hidden rounded-2xl bg-zinc-900">
                      {image && (
                        <Image
                          src={image}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 90vw"
                          className="object-cover grayscale transition-all duration-500 group-hover:grayscale-0"
                        />
                      )}
                      <div className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent" />
                    </div>
                    <h3 className="truncate text-left text-sm font-black uppercase italic tracking-tight">{title}</h3>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-cyan-500">{getReleaseYear(item) || "—"}</span>
                      <ArrowRight className="h-3 w-3 text-zinc-600 transition-colors group-hover:text-white" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className={cn(type.meta, "py-16 text-center")}>{t("noSimilar")}</p>
          )}

          <div className="text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-[10px] font-black uppercase tracking-widest text-black transition-all hover:bg-cyan-500"
            >
              {t("backHome")}
            </Link>
          </div>
        </section>
      </PageShell>
    );
  }

  const released = movie.release_date ? format.dateTime(new Date(movie.release_date), { dateStyle: "medium" }) : null;

  return (
    <PageShell>
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-cyan-500 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-black shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            {t("quality4k")}
          </span>
          <span className={type.meta}>{t("nowPlaying")}</span>
        </div>
        <h1 className={cn(type.h1, "wrap-break-word")}>
          {movie.title}
          <span className="text-cyan-500 not-italic">.</span>
        </h1>
      </header>

      <StreamPlayer
        kind="movie"
        mediaId={String(movie.id)}
        imdbId={movie.external_ids?.imdb_id ?? undefined}
        posterPath={movie.poster_path}
        backdropPath={movie.backdrop_path}
        title={movie.title}
        // Not awaited: the player shows now, the action bar streams in.
        interaction={getMediaInteraction({ mediaId: String(movie.id), type: "MOVIE" })}
      />

      <AdWrapper>
        <NativeBannerAd />
      </AdWrapper>

      <section className="grid grid-cols-1 gap-12 border-t border-white/5 pt-12 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <h2 className={cn(type.meta, "flex items-center gap-2")}>
            <Search className="h-4 w-4 text-cyan-500" aria-hidden />
            {t("synopsis")}
          </h2>
          {movie.overview && <p className="text-lg italic leading-relaxed text-zinc-400">“{movie.overview}”</p>}
        </div>

        <div className="group relative space-y-6 overflow-hidden rounded-[3rem] border border-white/5 bg-zinc-900/30 p-8 backdrop-blur-sm">
          <Sparkles className="absolute top-4 right-4 h-12 w-12 text-cyan-500 opacity-10 transition-opacity group-hover:opacity-20" />
          <h2 className={type.meta}>{t("details")}</h2>
          <dl className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <dt className="text-[10px] font-bold uppercase tracking-tighter text-zinc-600">{t("runtime")}</dt>
              <dd className="text-sm font-bold tracking-widest text-white">
                {movie.runtime ? t("runtimeValue", { minutes: movie.runtime }) : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <dt className="text-[10px] font-bold uppercase tracking-tighter text-zinc-600">{t("released")}</dt>
              <dd className="text-sm font-bold tracking-widest text-white">{released ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <dt className="text-[10px] font-bold uppercase tracking-tighter text-zinc-600">{t("rating")}</dt>
              <dd className="text-sm font-bold tracking-widest text-white">{(movie.vote_average ?? 0).toFixed(1)}</dd>
            </div>
          </dl>
        </div>
      </section>
    </PageShell>
  );
}
