import Image from "next/image";
import { Star } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { SeriesDetails } from "@/action/get-kdrama-details.action";
import AdWrapper from "@/components/ads/ad-wrapper";
import NativeBannerAd from "@/components/ads/native-banner-ad";
import EpisodeExplorer from "@/components/episode-explorer";
import { Container } from "@/components/layout/container";
import { EmptyState } from "@/components/layout/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import { tmdbImage } from "@/lib/media";
import { spacing, type } from "@/lib/typography";
import { cn } from "@/lib/utils";
import type { AnimeEpisode } from "@/typing";

/** Shared anime / series details page (hero + season & episode explorer). */
export default async function SeriesDetailsView({
  series,
  initialEpisodes,
  path,
}: {
  series: SeriesDetails | null;
  initialEpisodes: AnimeEpisode[];
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

  const backdrop = tmdbImage(series.backdrop_path || series.poster_path);
  const badge =
    path === "anime"
      ? t("animeBadge")
      : series.origin_country?.includes("KR")
        ? t("kdramaBadge")
        : t("seriesBadge");
  const showOriginal = series.original_name && series.original_name !== series.name;

  return (
    <main className={cn("min-h-screen bg-black text-white", spacing.pageBottom)}>
      <section className="relative flex h-[69vh] min-h-130 w-full items-end">
        {backdrop && (
          <Image
            src={backdrop}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent" />

        <Container className="relative pb-10">
          <div className="max-w-4xl space-y-4">
            <div className="flex items-center gap-4">
              <span className="rounded-full bg-cyan-500 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                {badge}
              </span>
              <span className="flex items-center gap-1 font-bold text-cyan-400">
                <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
                <span className="text-sm">{(series.vote_average ?? 0).toFixed(1)}</span>
              </span>
            </div>

            <h1 className={cn(type.display, "wrap-break-word")}>
              {series.name}
              <span className="text-cyan-500 not-italic">.</span>
            </h1>
            {showOriginal && (
              <p className="text-2xl font-black uppercase tracking-tighter text-zinc-600 md:text-3xl">
                {series.original_name}
              </p>
            )}
            {series.overview && (
              <p className={cn(type.body, "line-clamp-3 max-w-2xl italic")}>{series.overview}</p>
            )}
          </div>
        </Container>
      </section>

      <Container className={spacing.section}>
        <EpisodeExplorer
          seriesId={String(series.id)}
          initialEpisodes={initialEpisodes}
          seasons={series.seasons ?? []}
          path={path}
        />
      </Container>

      <AdWrapper>
        <NativeBannerAd />
      </AdWrapper>
    </main>
  );
}
