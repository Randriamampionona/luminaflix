import { Clapperboard, Play, Star } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getSameGenre, getTitleDetails, type DetailsType, type TitleDetails } from "@/action/get-title-details.action";
import PageAd from "@/components/ads/page-ad";
import ExpandableText from "@/components/details/expandable-text";
import FrVersionBadge from "@/components/details/fr-version-badge";
import { Container } from "@/components/layout/container";
import { SectionHeader } from "@/components/layout/page-header";
import MovieRow from "@/components/movie-row";
import JsonLd from "@/components/seo/json-ld";
import { getTrailerHref, getWatchHref, inferMediaKind, tmdbImage, type MediaKind } from "@/lib/media";
import { titleMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/site-url";
import type { Movie } from "@/typing";

type Params = Promise<{ type: string; id: string }>;

const isType = (type: string): type is DetailsType => type === "movie" || type === "tv";

/** Movie → "movie"; series → tv / kdrama / anime (decides the watch link and labels). */
function kindOf(type: DetailsType, data: TitleDetails): MediaKind {
  if (type === "movie") return "movie";
  return inferMediaKind({
    id: data.id,
    name: data.name,
    media_type: "tv",
    genre_ids: data.genres?.map((g) => g.id),
    original_language: data.original_language,
    origin_country: data.origin_country,
  } as Movie);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { type, id } = await params;
  // Unknown type / title: a real 404 (decided here, before the page starts streaming).
  if (!isType(type)) notFound();
  const data = await getTitleDetails(type, id);
  if (!data) notFound();
  return titleMetadata({
    kind: kindOf(type, data),
    id,
    title: (data.title || data.name) ?? "",
    description: data.overview,
    index: true,
  });
}

/**
 * /details/movie/[id] and /details/tv/[id] — the full page of a title: hero
 * (backdrop, poster, genres, rating, synopsis, watch / trailer), cast, details,
 * "you may also like" (TMDB recommendations) and "same genre" rows.
 * The details pop-up opens it with "Full details".
 */
export default async function DetailsPage({ params }: { params: Params }) {
  const { type, id } = await params;
  if (!isType(type)) notFound();
  const data = await getTitleDetails(type, id);
  if (!data) notFound();

  const [t, tm, locale] = await Promise.all([getTranslations("titlePage"), getTranslations("media"), getLocale()]);
  const kind = kindOf(type, data);
  const title = (data.title || data.name) ?? "";
  const originalTitle = data.original_title || data.original_name;
  const date = data.release_date || data.first_air_date || "";
  const year = date.slice(0, 4);
  const backdrop = data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : null;
  const poster = tmdbImage(data.poster_path);
  const runtime = data.runtime || data.episode_run_time?.[0] || null;
  const label = { movie: tm("movie"), tv: tm("series"), kdrama: tm("kdrama"), anime: tm("anime") }[kind];

  const sameGenre = await getSameGenre(type, data.genres?.[0]?.id, data.id).catch(() => [] as Movie[]);
  const recommendations = (data.recommendations?.results?.length ? data.recommendations : data.similar)?.results ?? [];
  const alsoLike = recommendations
    .filter((m) => m.poster_path && m.id !== data.id)
    .slice(0, 18)
    .map((m) => ({ ...m, media_type: m.media_type ?? type }));

  const cast = (data.credits?.cast ?? []).slice(0, 18);
  const crew = data.credits?.crew ?? [];
  const directors = crew.filter((p) => p.job === "Director").map((p) => p.name);
  const writers = [...new Set(crew.filter((p) => p.department === "Writing").map((p) => p.name))].slice(0, 3);
  const creators = data.created_by?.map((p) => p.name) ?? [];

  // Details box (only the lines TMDB knows)
  const fmtDate = (d?: string) =>
    d ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(d)) : null;
  const fmtMoney = (n?: number) =>
    n ? new Intl.NumberFormat(locale, { style: "currency", currency: "USD", notation: "compact" }).format(n) : null;
  const languageName = (code?: string) => {
    try {
      return code ? new Intl.DisplayNames([locale], { type: "language" }).of(code) : null;
    } catch {
      return code ?? null;
    }
  };
  const statusKey = data.status ? `status.${data.status.replace(/\s+/g, "")}` : null;
  const facts: [string, string | null | undefined][] = [
    [type === "movie" ? t("releaseDate") : t("firstAirDate"), fmtDate(date)],
    [t("lastAirDate"), type === "tv" ? fmtDate(data.last_air_date) : null],
    [t("runtime"), runtime ? tm("runtimeValue", { minutes: runtime }) : null],
    [t("seasons"), data.number_of_seasons ? String(data.number_of_seasons) : null],
    [t("episodeCount"), data.number_of_episodes ? String(data.number_of_episodes) : null],
    [t("originalTitle"), originalTitle && originalTitle !== title ? originalTitle : null],
    [t("originalLanguage"), languageName(data.original_language)],
    [t("countries"), data.production_countries?.map((c) => c.name).join(", ") || null],
    [t("networks"), data.networks?.map((n) => n.name).join(", ") || null],
    [
      t("studios"),
      data.production_companies
        ?.slice(0, 4)
        .map((c) => c.name)
        .join(", ") || null,
    ],
    [t("budget"), fmtMoney(data.budget)],
    [t("revenue"), fmtMoney(data.revenue)],
    [
      t("statusLabel"),
      statusKey && t.has(statusKey as "status.Released") ? t(statusKey as "status.Released") : data.status,
    ],
  ];

  return (
    <main className="min-h-screen bg-background pb-16 text-foreground">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": type === "movie" ? "Movie" : "TVSeries",
          name: title,
          description: data.overview,
          image: poster ?? undefined,
          datePublished: date || undefined,
          genre: data.genres?.map((g) => g.name),
          url: `${SITE_URL}/details/${type}/${id}`,
          aggregateRating: data.vote_count
            ? {
                "@type": "AggregateRating",
                ratingValue: data.vote_average,
                ratingCount: data.vote_count,
                bestRating: 10,
              }
            : undefined,
        }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        {backdrop && (
          <Image src={backdrop} alt="" fill priority sizes="100vw" className="object-cover object-top opacity-60" />
        )}
        <div className="absolute inset-0 bg-linear-to-r from-background via-background/85 to-background/30" />
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/40 to-transparent" />

        <Container className="relative grid gap-8 pt-28 pb-12 sm:pt-36 md:grid-cols-[230px_minmax(0,1fr)] md:items-center lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
          <div className="relative mx-auto aspect-2/3 w-44 overflow-hidden rounded-2xl border border-line-strong shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)] sm:w-52 md:mx-0 md:w-full">
            {poster ? (
              <Image
                src={poster}
                alt={title}
                fill
                priority
                sizes="(min-width: 768px) 260px, 208px"
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full bg-elevated" />
            )}
          </div>

          <div className="min-w-0 space-y-4">
            <p className="flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-wide text-brand-bright uppercase">
              <span>{label}</span>
              {year && <span>· {year}</span>}
              {runtime ? <span>· {tm("runtimeValue", { minutes: runtime })}</span> : null}
              {data.number_of_seasons ? <span>· {tm("seasons", { count: data.number_of_seasons })}</span> : null}
              <FrVersionBadge kind={kind} id={data.id} />
            </p>
            <h1 className="text-4xl leading-[1.05] font-black tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            {data.genres?.length ? (
              <div className="flex flex-wrap gap-2">
                {data.genres.map((g) => (
                  <Link
                    key={g.id}
                    href={`/genres/${g.id}`}
                    className="rounded-full border border-line-strong bg-tint px-3 py-1 text-xs font-semibold text-fg-soft transition-colors hover:border-cyan-500/50 hover:text-foreground"
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            ) : null}
            {data.vote_count > 0 && (
              <p className="flex items-center gap-2 text-sm">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
                <span className="font-black text-foreground">{data.vote_average.toFixed(1)}</span>
                <span className="text-fg-subtle">/ 10 TMDB · {t("votes", { count: data.vote_count })}</span>
              </p>
            )}
            {data.tagline && <p className="text-sm text-fg-muted italic">“{data.tagline}”</p>}
            {data.overview && <ExpandableText text={data.overview} more={t("more")} less={t("less")} />}

            {(directors.length > 0 || creators.length > 0 || writers.length > 0) && (
              <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                {(directors.length > 0 || creators.length > 0) && (
                  <div className="flex gap-2">
                    <dt className="text-fg-subtle">{type === "movie" ? t("director") : t("createdBy")}</dt>
                    <dd className="font-semibold text-foreground">
                      {(directors.length ? directors : creators).join(", ")}
                    </dd>
                  </div>
                )}
                {writers.length > 0 && (
                  <div className="flex gap-2">
                    <dt className="text-fg-subtle">{t("writers")}</dt>
                    <dd className="font-semibold text-foreground">{writers.join(", ")}</dd>
                  </div>
                )}
              </dl>
            )}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
              <Link
                href={getWatchHref(data.id, kind, title)}
                className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-cyan-500 px-7 py-3.5 text-sm font-black text-black shadow-[0_14px_40px_-12px_rgba(6,182,212,0.8)] transition-colors hover:bg-cyan-400"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden />
                {kind === "movie" ? t("watchNow") : t("episodes")}
              </Link>
              <Link
                href={getTrailerHref(data.id, kind, title)}
                className="inline-flex items-center justify-center gap-2.5 rounded-2xl border border-line-strong bg-elevated/80 px-6 py-3.5 text-sm font-bold text-foreground backdrop-blur-md transition-colors hover:border-cyan-500/50"
              >
                <Clapperboard className="h-4 w-4 text-brand" aria-hidden />
                {t("trailer")}
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <Container className="space-y-14 pt-12">
        {/* Cast */}
        {cast.length > 0 && (
          <section aria-labelledby="cast-title" className="space-y-5">
            <SectionHeader id="cast-title" title={t("cast")} />
            <ul className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 scrollbar-hide sm:grid sm:grid-cols-[repeat(auto-fill,minmax(110px,1fr))] sm:overflow-visible">
              {cast.map((p) => (
                <li key={`${p.id}-${p.character}`} className="w-24 shrink-0 text-center sm:w-auto">
                  <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-full border border-line-strong bg-elevated">
                    {p.profile_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w185${p.profile_path}`}
                        alt={p.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-xl font-black text-fg-faint">
                        {p.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 truncate text-xs font-bold text-foreground">{p.name}</p>
                  {p.character && <p className="truncate text-[11px] text-fg-subtle">{p.character}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Details */}
        <section aria-labelledby="facts-title" className="space-y-5">
          <SectionHeader id="facts-title" title={t("info")} />
          <dl className="grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {facts
              .filter(([, value]) => value)
              .map(([name, value]) => (
                <div key={name} className="bg-surface px-5 py-4">
                  <dt className="text-[10px] font-black tracking-widest text-fg-subtle uppercase">{name}</dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">{value}</dd>
                </div>
              ))}
          </dl>
        </section>
      </Container>

      {/* Suggestions */}
      {alsoLike.length > 0 && <MovieRow title={t("alsoLike")} movies={alsoLike} />}
      {sameGenre.length > 0 && (
        <MovieRow title={t("sameGenre")} movies={sameGenre} type={type === "movie" ? "movie" : undefined} />
      )}

      <Container>
        <PageAd />
      </Container>
    </main>
  );
}
