import { getMovieData } from "@/action/get-movie-data.action";
import VideoPlayer from "@/components/movies/video-player";
import { notFound } from "next/navigation";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const movie = await getMovieData(id);

  if (!movie) notFound();

  return (
    <div className="min-h-screen bg-black pt-32 pb-20 px-8 md:px-16 text-white">
      <div className="max-w-350 mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-cyan-500 rounded-lg text-black text-[10px] font-black uppercase tracking-widest">
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

        {/* Player */}
        <VideoPlayer movieId={id} />

        {/* Bottom Info Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 pt-12 border-t border-white/5">
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
              Synopsis
            </h3>
            <p className="text-zinc-400 leading-relaxed text-lg">
              {movie.overview}
            </p>
          </div>
          <div className="bg-zinc-900/30 p-8 rounded-[2rem] border border-white/5 space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
              Details
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase text-zinc-600">
                  Runtime
                </p>
                <p className="text-sm font-bold text-white tracking-widest">
                  {movie.runtime} Minutes
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-zinc-600">
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
