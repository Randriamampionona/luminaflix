import { getFeatured } from "@/action/get-featured.action";
import { getGenres } from "@/action/get-genres.action";
import { getLatestMovies } from "@/action/get-latest-movies.action";
import { getTopRatedMovies } from "@/action/get-top-rated-movies.action";
import { getTrendingHero } from "@/action/get-trending-hero.action";
import { getTrendingTV } from "@/action/get-trending-TV.action";
import FeaturedBanner from "@/components/featured-banner";
import GenreCard from "@/components/genre-card";
import HomeCTA from "@/components/home-cta";
import MovieDetails from "@/components/movie-details";
import MovieRow from "@/components/movie-row";
import { ArrowRight, Info, Play } from "lucide-react";
import Link from "next/link";

export default async function HomePage() {
  const genres = await getGenres();
  const heroMovie = await getTrendingHero();
  const topMovies = await getTopRatedMovies();
  const topTV = await getTrendingTV();
  const featured = await getFeatured();
  const latestMovies = await getLatestMovies();

  if (!heroMovie)
    return (
      <div className="bg-black min-h-screen text-white p-10">
        Error loading movie...
      </div>
    );

  return (
    <main className="relative min-h-screen bg-black">
      <section className="relative h-screen w-full flex items-center overflow-hidden">
        {/* Background Image - Dynamic from Action */}
        <div className="absolute inset-0 z-0">
          <img
            src={`https://image.tmdb.org/t/p/original${heroMovie.backdrop_path}`}
            alt={heroMovie.title}
            className="w-full h-full object-cover opacity-60 transition-opacity duration-1000"
          />
          <div className="absolute inset-0 bg-linear-to-r from-black via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent" />
        </div>

        {/* Content Area */}
        <div className="relative z-10 px-8 md:px-16 max-w-3xl">
          <div className="flex items-center space-x-3 mb-4">
            <span className="bg-cyan-500 text-black text-[10px] font-black px-2 py-0.5 rounded tracking-tighter">
              TRENDING NOW
            </span>
            <span className="text-white/60 text-xs tracking-[0.2em] uppercase font-bold">
              Luminaflix Originals
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 tracking-tighter uppercase italic drop-shadow-2xl line-clamp-2">
            {heroMovie.title}
            <span className="text-cyan-500 not-italic">.</span>
          </h1>

          <p className="text-lg text-white/80 mb-8 line-clamp-3 leading-relaxed max-w-xl drop-shadow-md">
            {heroMovie.overview}
          </p>

          {/* Action Buttons with Lucide Icons */}
          <div className="flex flex-wrap gap-4">
            <Link href={`/movies/${heroMovie.id}`} prefetch={false}>
              <button className="group flex items-center gap-3 bg-white text-black px-10 py-4 rounded-full font-black uppercase text-sm hover:bg-cyan-500 hover:text-white transition-all duration-500 shadow-[0_0_30px_rgba(255,255,255,0.1)] cursor-pointer">
                <Play className="w-5 h-5 fill-current" />
                Play Now
              </button>
            </Link>

            <MovieDetails movie={heroMovie}>
              <button className="group flex items-center gap-3 bg-white/10 text-white px-10 py-4 rounded-full font-black uppercase text-sm backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all cursor-pointer">
                <Info className="w-5 h-5 text-cyan-400" />
                More Info
              </button>
            </MovieDetails>
          </div>
        </div>

        {/* The Lumina Line */}
        <div className="absolute bottom-0 left-0 w-full h-px bg-linear-to-r from-transparent via-cyan-500 to-transparent opacity-30 shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
      </section>

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
            <Link
              href="/genres"
              className="group flex items-center justify-between gap-4 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:border-cyan-500/50 transition-all duration-300"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 group-hover:text-white transition-colors">
                View All Archives
              </span>
              <div className="p-2 bg-zinc-900 rounded-lg group-hover:bg-cyan-500 transition-colors">
                <ArrowRight className="w-3 h-3 text-white group-hover:scale-110 transition-transform" />
              </div>
            </Link>
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
