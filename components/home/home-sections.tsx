import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getFeatured } from "@/action/get-featured.action";
import { getGenres } from "@/action/get-genres.action";
import { getLatestMovies } from "@/action/get-latest-movies.action";
import { getTopRatedMovies } from "@/action/get-top-rated-movies.action";
import { getTrendingHero } from "@/action/get-trending-hero.action";
import { getTrendingTV } from "@/action/get-trending-TV.action";
import FeaturedBanner from "@/components/featured-banner";
import GenreCard from "@/components/genre-card";
import HeroSlider from "@/components/hero-slider";
import { Container } from "@/components/layout/container";
import { EmptyState } from "@/components/layout/empty-state";
import { SectionHeader } from "@/components/layout/page-header";
import MovieRow from "@/components/movie-row";
import { spacing } from "@/lib/typography";

/*
 * Home page sections. Each one fetches its own data and is wrapped in its own
 * <Suspense> in app/page.tsx, so the hero shows as soon as it's ready instead
 * of waiting for the slowest of the six TMDB requests.
 */

const HOME_GENRES = 10;

export async function HeroSection() {
  const [t, movies] = await Promise.all([getTranslations("home"), getTrendingHero()]);
  if (movies.length === 0) {
    return (
      <Container className="pt-32 pb-10">
        <EmptyState title={t("loadError")} />
      </Container>
    );
  }
  return <HeroSlider trendingMovies={movies} />;
}

export async function TopFilmsRow() {
  const [t, movies] = await Promise.all([getTranslations("home"), getTopRatedMovies()]);
  return <MovieRow title={t("topFilms")} movies={movies} type="movie" priority />;
}

export async function TopTvRow() {
  const [t, shows] = await Promise.all([getTranslations("home"), getTrendingTV()]);
  return <MovieRow title={t("topTv")} movies={shows} type="tv" />;
}

export async function LatestRow() {
  const [t, movies] = await Promise.all([getTranslations("home"), getLatestMovies()]);
  return <MovieRow title={t("latest")} movies={movies} type="movie" />;
}

export async function FeaturedSection() {
  const featured = await getFeatured();
  return featured ? <FeaturedBanner movie={featured} /> : null;
}

export async function GenresSection() {
  const [t, genres] = await Promise.all([getTranslations("home"), getGenres(HOME_GENRES)]);
  if (genres.length === 0) return null;

  return (
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
  );
}
