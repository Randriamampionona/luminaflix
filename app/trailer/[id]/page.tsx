import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cache } from "react";
import { ArrowLeft, Clapperboard, ExternalLink, Globe, Info, Play, ShieldAlert, Star } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { getKDramaDetails } from "@/action/get-kdrama-details.action";
import { getMovieData } from "@/action/get-movie-data.action";
import { getMovieTrailer } from "@/action/get-movie-trailer.action";
import { PageShell } from "@/components/layout/page-shell";
import { isLocale, localeMeta, locales, type Locale } from "@/i18n/config";
import { getWatchHref, tmdbImage, type MediaKind } from "@/lib/media";
import { type as typo } from "@/lib/typography";
import { cn } from "@/lib/utils";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ type?: string; fallback?: string; lang?: string }>;

const toKind = (value?: string): MediaKind => (value === "anime" ? "anime" : value === "tv" ? "tv" : "movie");

interface TitleDetails {
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  year: string;
  rating: number;
  runtime: number | null;
  seasons: number | null;
  genres: string[];
}

/** Movie or series details, normalized. Cached per request (metadata + page). */
const getTitleDetails = cache(async (id: string, kind: MediaKind): Promise<TitleDetails | null> => {
  if (kind === "movie") {
    const movie = await getMovieData(id);
    if (!movie) return null;
    return {
      title: movie.title,
      overview: movie.overview,
      posterPath: movie.poster_path,
      backdropPath: movie.backdrop_path,
      year: movie.release_date?.slice(0, 4) ?? "",
      rating: movie.vote_average ?? 0,
      runtime: movie.runtime,
      seasons: null,
      genres: movie.genres?.map((g) => g.name) ?? [],
    };
  }

  const series = await getKDramaDetails(id);
  if (!series) return null;
  return {
    title: series.name,
    overview: series.overview,
    posterPath: series.poster_path,
    backdropPath: series.backdrop_path,
    year: series.first_air_date?.slice(0, 4) ?? "",
    rating: series.vote_average ?? 0,
    runtime: null,
    seasons: series.number_of_seasons ?? series.seasons?.filter((s) => s.season_number > 0).length ?? null,
    genres: series.genres?.map((g) => g.name) ?? [],
  };
});

/** "fr" → "French" / "français", following the UI language. */
function languageName(code: string, displayLocale: string) {
  try {
    return new Intl.DisplayNames([displayLocale], { type: "language" }).of(code) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const [{ id }, sp, t] = await Promise.all([params, searchParams, getTranslations("metadata.pages")]);
  const details = await getTitleDetails(id, toKind(sp.type));
  return {
    title: details ? `${t("trailer")} · ${details.title}` : t("trailer"),
    robots: { index: false },
  };
}

/**
 * Trailer page — no pre-roll ad and no banner: the YouTube trailer starts
 * immediately. Fully server-rendered; the language switch is plain links.
 */
export default async function TrailerPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ id }, sp, uiLocale] = await Promise.all([params, searchParams, getLocale()]);
  const kind = toKind(sp.type);
  const requested: Locale = isLocale(sp.lang) ? sp.lang : (uiLocale as Locale);

  const [t, tMedia, trailer, details] = await Promise.all([
    getTranslations("trailer"),
    getTranslations("media"),
    getMovieTrailer(id, requested, kind),
    getTitleDetails(id, kind),
  ]);

  const title = details?.title ?? "";
  const watchHref = getWatchHref(id, kind, title || sp.fallback);
  const backdrop = tmdbImage(details?.backdropPath);
  const poster = tmdbImage(details?.posterPath);
  const kindLabel = kind === "anime" ? tMedia("anime") : kind === "tv" ? tMedia("series") : tMedia("movie");

  // TMDB may only have the trailer in another language (e.g. English only).
  const isOtherLanguage = !!trailer?.lang && trailer.lang !== requested;

  const langHref = (lang: Locale) => {
    const query = new URLSearchParams({ lang, type: kind });
    if (sp.fallback) query.set("fallback", sp.fallback);
    return `/trailer/${id}?${query.toString()}`;
  };

  const embedSrc = trailer
    ? `https://www.youtube-nocookie.com/embed/${trailer.key}?${new URLSearchParams({
        autoplay: "1",
        rel: "0",
        modestbranding: "1",
        playsinline: "1",
        hl: uiLocale,
        cc_lang_pref: requested,
      }).toString()}`
    : null;

  return (
    <PageShell className="relative isolate" containerClassName="max-w-6xl">
      {/* Ambient backdrop */}
      {backdrop && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[75vh] overflow-hidden">
          <Image src={backdrop} alt="" fill priority sizes="100vw" className="scale-110 object-cover opacity-30 blur-2xl" />
          <div className="absolute inset-0 bg-linear-to-b from-black/30 via-black/70 to-black" />
        </div>
      )}

      <nav className="flex items-center justify-between gap-4">
        <Link href="/" className="group inline-flex min-w-0 items-center gap-3 text-zinc-400 transition-colors hover:text-white">
          <span className="rounded-full border border-white/10 bg-black/40 p-2 transition-colors group-hover:border-cyan-500 group-hover:text-cyan-400">
            <ArrowLeft className="h-4 w-4" />
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.25em]">{t("back")}</span>
        </Link>
        <span className={cn(typo.eyebrow, "hidden items-center gap-2 sm:inline-flex")}>
          <Clapperboard className="h-3.5 w-3.5" aria-hidden />
          {t("eyebrow")}
        </span>
      </nav>

      {/* Player */}
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-black shadow-[0_0_100px_-30px_rgba(6,182,212,0.35)] ring-1 ring-white/5">
        <div className="relative aspect-video w-full">
          {embedSrc ? (
            <iframe
              key={embedSrc}
              src={embedSrc}
              title={t("playerTitle", { title: title || t("eyebrow") })}
              className="absolute inset-0 h-full w-full"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
              {backdrop && (
                <Image src={backdrop} alt="" fill sizes="(min-width: 1152px) 1152px, 100vw" className="object-cover opacity-20" />
              )}
              <div className="absolute inset-0 bg-black/50" />
              <ShieldAlert className="relative h-10 w-10 text-zinc-500" aria-hidden />
              <div className="relative space-y-1">
                <p className="text-sm font-bold text-white">{t("unavailable")}</p>
                <p className="text-xs text-zinc-400">{t("unavailableHint")}</p>
              </div>
              <Link
                href={watchHref}
                className="relative inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-black transition-colors hover:bg-cyan-400"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden />
                {t("start")}
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Title details */}
        <section aria-labelledby="trailer-title" className="flex gap-5 lg:col-span-8">
          {poster && (
            <div className="relative hidden aspect-2/3 w-32 shrink-0 overflow-hidden rounded-2xl border border-white/10 shadow-2xl sm:block">
              <Image src={poster} alt="" fill sizes="128px" className="object-cover" />
            </div>
          )}

          <div className="min-w-0 space-y-4">
            <span className="inline-block rounded-full bg-cyan-500 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-black">
              {kindLabel}
            </span>
            <h1 id="trailer-title" className={cn(typo.h2, "wrap-break-word")}>
              {title || t("eyebrow")}
              <span className="text-cyan-500 not-italic">.</span>
            </h1>

            {details && (
              <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-zinc-400">
                {details.year && <li>{details.year}</li>}
                {details.rating > 0 && (
                  <li className="flex items-center gap-1 font-bold text-cyan-400">
                    <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
                    {details.rating.toFixed(1)}
                    <span className="sr-only">{tMedia("rating")}</span>
                  </li>
                )}
                {details.runtime ? <li>{tMedia("runtimeValue", { minutes: details.runtime })}</li> : null}
                {details.seasons ? <li>{tMedia("seasons", { count: details.seasons })}</li> : null}
              </ul>
            )}

            {details && details.genres.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {details.genres.slice(0, 4).map((genre) => (
                  <li
                    key={genre}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-300"
                  >
                    {genre}
                  </li>
                ))}
              </ul>
            )}

            {details?.overview && <p className={cn(typo.body, "line-clamp-4 max-w-2xl")}>{details.overview}</p>}
          </div>
        </section>

        {/* Actions + language */}
        <aside className="space-y-6 self-start rounded-4xl border border-white/10 bg-zinc-950/70 p-6 backdrop-blur-md lg:col-span-4">
          <Link
            href={watchHref}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white py-4 text-black transition-all duration-300 hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.35)] active:scale-[0.98]"
          >
            <Play className="h-4 w-4 fill-current" aria-hidden />
            <span className="text-xs font-black uppercase tracking-[0.3em]">{t("start")}</span>
          </Link>

          <div className="space-y-3">
            <p className={cn(typo.meta, "flex items-center gap-2")}>
              <Globe className="h-3.5 w-3.5 text-cyan-500" aria-hidden />
              {t("language")}
            </p>
            <div role="group" aria-label={t("language")} className="grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-black/60 p-1">
              {locales.map((lang) => {
                const active = lang === requested;
                return (
                  <Link
                    key={lang}
                    href={langHref(lang)}
                    replace
                    scroll={false}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors",
                      active ? "bg-cyan-500 text-black" : "text-zinc-400 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <span className={cn("text-[10px] font-black", active ? "text-black/60" : "text-zinc-600")}>
                      {localeMeta[lang].short}
                    </span>
                    {localeMeta[lang].nativeName}
                  </Link>
                );
              })}
            </div>

            {isOtherLanguage && trailer?.lang && (
              <p className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-200/90">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {t("fallbackNotice", {
                  requested: languageName(requested, uiLocale),
                  available: languageName(trailer.lang, uiLocale),
                })}
              </p>
            )}
          </div>

          {trailer && (
            <a
              href={`https://www.youtube.com/watch?v=${trailer.key}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 transition-colors hover:text-white"
            >
              {t("openYoutube")}
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          )}
        </aside>
      </div>
    </PageShell>
  );
}