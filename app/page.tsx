import { getFeatured } from "@/action/get-featured.action";
import { getGenres } from "@/action/get-genres.action";
import { getLatestMovies } from "@/action/get-latest-movies.action";
import { getTopRatedMovies } from "@/action/get-top-rated-movies.action";
import { getTrendingHero } from "@/action/get-trending-hero.action";
import { getTrendingTV } from "@/action/get-trending-TV.action";
import CustomLink from "@/components/custom-link";
import FeaturedBanner from "@/components/featured-banner";
import GenreCard from "@/components/genre-card";
import HeroSlider from "@/components/hero-slider";
import HomeCTA from "@/components/home-cta";
import MovieDetails from "@/components/movie-details";
import MovieRow from "@/components/movie-row";
import { ArrowRight, Info, Play } from "lucide-react";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ display_lang?: string }>;
}) {
  const { display_lang } = await searchParams;

  const heroMovie = await getTrendingHero({ display_lang });
  const topMovies = await getTopRatedMovies({ display_lang });
  const genres = await getGenres({ display_lang });
  const topTV = await getTrendingTV({ display_lang });
  const featured = await getFeatured({ display_lang });
  const latestMovies = await getLatestMovies({ display_lang });

  if (!heroMovie)
    return (
      <div className="bg-black min-h-screen text-white p-10">
        Error loading movie...
      </div>
    );

  return (
    <main className="relative min-h-screen bg-black">
      <HeroSlider trendingMovies={heroMovie} />

      <div className="relative">
        <MovieRow title="Top Films" movies={topMovies} />

        <section className="px-8 md:px-16 my-20">
          {/* Header with Title and Link */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <div className="h-0.5 w-8 bg-cyan-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-500">
                  Database Index
                </span>
              </div>
              <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white mt-2">
                Browse by <span className="text-cyan-500">Category.</span>
              </h2>
            </div>

            {/* PRO "VIEW ALL" LINK */}
            <CustomLink
              href="/genres"
              className="group flex items-center justify-between gap-4 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:border-cyan-500/50 transition-all duration-300"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 group-hover:text-white transition-colors">
                View All Archives
              </span>
              <div className="p-2 bg-zinc-900 rounded-lg group-hover:bg-cyan-500 transition-colors">
                <ArrowRight className="w-3 h-3 text-white group-hover:scale-110 transition-transform" />
              </div>
            </CustomLink>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {genres.slice(0, 10).map((genre) => (
              <GenreCard key={genre.id} genre={genre} />
            ))}
          </div>
        </section>

        <MovieRow title="Top 10 TV Series This Week" movies={topTV} />
        {featured && <FeaturedBanner movie={featured} />}
        <HomeCTA />
        <MovieRow title="Latest Movies" movies={latestMovies} />
      </div>
    </main>
  );
}
