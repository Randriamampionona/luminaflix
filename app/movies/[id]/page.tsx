import { getFallbackMovie } from "@/action/get-fallback-movies.action";
import { getMovieData } from "@/action/get-movie-data.action";
import VideoPlayer from "@/components/movies/video-player";
import { AlertCircle, ArrowRight, Search, Sparkles } from "lucide-react";
import Link from "next/link";

export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fallback?: string }>;
}) {
  const { id } = await params;
  const { fallback } = await searchParams;

  // Attempt to fetch the primary movie data
  const movie = await getMovieData(id);

  // IF MOVIE NOT FOUND: Display the "Discovery" UI
  if (!movie) {
    // This calls your Server Action securely
    const alternatives = fallback ? await getFallbackMovie(fallback) : [];

    return (
      <div className="min-h-screen bg-black pt-32 pb-20 px-8 md:px-16 text-white flex flex-col items-center">
        <div className="max-w-4xl w-full text-center space-y-8">
          {/* Signal Lost Icon with Pulse Effect */}
          <div className="relative inline-block">
            <div className="absolute -inset-4 bg-red-500/20 blur-2xl rounded-full animate-pulse" />
            <AlertCircle className="w-16 h-16 text-red-500 relative" />
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">
              Signal Lost<span className="text-red-500">.</span>
            </h1>
            <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px]">
              Archive ID #{id} is currently unreachable
            </p>
          </div>

          {/* Fallback Section */}
          <div className="pt-12 space-y-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-cyan-500" />
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-400">
                  Recommended for: {fallback || "Current Session"}
                </h2>
              </div>
            </div>

            {/* Alternatives Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {alternatives.length > 0 ? (
                alternatives.slice(0, 6).map((item: any) => (
                  <Link
                    key={item.id}
                    href={`/movies/${item.id}?fallback=${encodeURIComponent(item.title)}`}
                    className="group bg-zinc-900/40 border border-white/5 rounded-[2rem] p-4 hover:bg-zinc-800/60 transition-all hover:scale-[1.02]"
                  >
                    <div className="aspect-video rounded-2xl overflow-hidden mb-4 relative">
                      <img
                        src={`https://image.tmdb.org/t/p/w500${item.backdrop_path || item.poster_path}`}
                        alt={item.title}
                        className="object-cover w-full h-full grayscale group-hover:grayscale-0 transition-all duration-500"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent" />
                    </div>
                    <h3 className="text-sm font-black uppercase italic tracking-tight text-left truncate">
                      {item.title}
                    </h3>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] font-bold text-cyan-500">
                        {item.release_date?.split("-")[0] || "N/A"}
                      </span>
                      <ArrowRight className="w-3 h-3 text-zinc-600 group-hover:text-white transition-colors" />
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-full py-20 text-zinc-600 font-black uppercase tracking-widest text-xs">
                  No similar archives found
                </div>
              )}
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-cyan-500 hover:text-white transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)]"
            >
              Return to Library
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // NORMAL PAGE IF MOVIE EXISTS
  return (
    <div className="min-h-screen bg-black pt-32 pb-20 px-8 md:px-16 text-white">
      <div className="max-w-350 mx-auto space-y-12">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-cyan-500 rounded-lg text-black text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(6,182,212,0.5)]">
              Premium 4K
            </span>
            <span className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">
              Now Playing
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">
            {movie.title}
            <span className="text-cyan-500">.</span>
          </h1>
        </div>

        {/* The Advanced Player Component */}
        <VideoPlayer movieId={id} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 pt-12 border-t border-white/5">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-cyan-500" />
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
                Synopsis
              </h3>
            </div>
            <p className="text-zinc-400 leading-relaxed text-lg italic">
              &ldquo;{movie.overview}&rdquo;
            </p>
          </div>

          {/* Details Bento Box */}
          <div className="bg-zinc-900/30 p-8 rounded-[3rem] border border-white/5 space-y-6 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles className="w-12 h-12 text-cyan-500" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
              Archive Details
            </h3>
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <p className="text-[10px] font-bold uppercase text-zinc-600 tracking-tighter">
                  Runtime
                </p>
                <p className="text-sm font-bold text-white tracking-widest">
                  {movie.runtime}m
                </p>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <p className="text-[10px] font-bold uppercase text-zinc-600 tracking-tighter">
                  Released
                </p>
                <p className="text-sm font-bold text-white tracking-widest">
                  {movie.release_date}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
