import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getFeatured } from "@/action/get-featured.action";
import { getGenres } from "@/action/get-genres.action";
import { getLatestMovies } from "@/action/get-latest-movies.action";
import { getTopRatedMovies } from "@/action/get-top-rated-movies.action";
import { getTrendingHero } from "@/action/get-trending-hero.action";
import { getTrendingTV } from "@/action/get-trending-TV.action";
import AdWrapper from "@/components/ads/ad-wrapper";
import NativeBannerAd from "@/components/ads/native-banner-ad";
import FeaturedBanner from "@/components/featured-banner";
import GenreCard from "@/components/genre-card";
import HeroSlider from "@/components/hero-slider";
import HomeCTA from "@/components/home-cta";
import { Container } from "@/components/layout/container";
import { EmptyState } from "@/components/layout/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import { SectionHeader } from "@/components/layout/page-header";
import MovieRow from "@/components/movie-row";
import { spacing } from "@/lib/typography";

const HOME_GENRES = 10;

export default async function HomePage() {
  const t = await getTranslations("home");

  // PERF: the six TMDB requests used to run one after another (waterfall).
  // They now run in parallel and are cached with `revalidate`.
  const [heroMovies, topMovies, genres, topTV, featured, latestMovies] = await Promise.all([
    getTrendingHero(),
    getTopRatedMovies(),
    getGenres(HOME_GENRES),
    getTrendingTV(),
    getFeatured(),
    getLatestMovies(),
  ]);

  if (heroMovies.length === 0 && topMovies.length === 0) {
    return (
      <PageShell>
        <EmptyState title={t("loadError")} />
      </PageShell>
    );
  }

  return (
    <main className="relative min-h-screen bg-black">
      {heroMovies.length > 0 && <HeroSlider trendingMovies={heroMovies} />}

      <div className="relative">
        <MovieRow title={t("topFilms")} movies={topMovies} type="movie" priority />

        <AdWrapper>
          <NativeBannerAd />
        </AdWrapper>

        {genres.length > 0 && (
          <section className={spacing.section} aria-labelledby="home-genres">
            <Container className="space-y-8">
              <SectionHeader
                id="home-genres"
                eyebrow={t("genresEyebrow")}
                title={t("genresTitle")}
                action={
                  <Link
                    href="/genres"
                    className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 transition-colors hover:border-cyan-500/50 sm:px-5"
                  >
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400 transition-colors group-hover:text-white">
                      {t("genresViewAll")}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-400" />
                  </Link>
                }
              />
              <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-5">
                {genres.map((genre) => (
                  <GenreCard key={genre.id} genre={genre} />
                ))}
              </div>
            </Container>
          </section>
        )}

        <MovieRow title={t("topTv")} movies={topTV} type="tv" />
        {featured && <FeaturedBanner movie={featured} />}
        <HomeCTA />
        <MovieRow title={t("latest")} movies={latestMovies} type="movie" />
      </div>
    </main>
  );
}
