import { getMoviesByGenre } from "@/action/get-movies-by-genre.action";
import { getAllGenres } from "@/action/get-all-genres.action"; // Using the action we built earlier
import MovieCard from "@/components/movie-card";
import Pagination from "@/components/movies/pagination";
import { ShieldCheck, Activity, Terminal } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function GenreSectorPage({ params, searchParams }: Props) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const id = resolvedParams.id;
  const page = Number(resolvedSearchParams.page) || 1;

  // 1. Fetch movies and genre list in parallel for maximum speed
  const [data, allGenres] = await Promise.all([
    getMoviesByGenre(id, page),
    getAllGenres(),
  ]);

  // 2. Find the current genre name based on the ID
  const currentGenre = allGenres.find((g) => g.id.toString() === id);
  const genreName = currentGenre ? currentGenre.name : "Unknown Sector";

  return (
    <main className="min-h-screen pt-32 pb-20 px-8 md:px-16 bg-black text-white">
      <div className="max-w-425 mx-auto">
        {/* SECTOR HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16 border-l-2 border-cyan-500 pl-8">
          <div>
            <div className="flex items-center gap-2 text-cyan-500 mb-2">
              <Terminal className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">
                Categorical Index / {id}
              </span>
            </div>

            {/* DYNAMIC TITLE */}
            <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none">
              ARCHIVE: <span className="text-cyan-500">{genreName}.</span>
            </h1>
          </div>

          {/* STATUS CARD */}
          <div className="flex items-center gap-4 bg-zinc-900/30 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
            <Activity className="w-5 h-5 text-cyan-500" />
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                Global Intelligence
              </span>
              <span className="text-xl font-black italic">
                {data.total_results.toLocaleString()} Reports
              </span>
            </div>
          </div>
        </div>

        {/* RESULTS GRID */}
        {data.results.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-12">
              {data.results.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>

            {/* PAGINATION FOOTER */}
            <div className="mt-20 border-t border-white/5 pt-10">
              <Pagination currentPage={page} totalPages={data.total_pages} />
            </div>
          </>
        ) : (
          <div className="h-[40vh] flex flex-col items-center justify-center border border-dashed border-white/10 rounded-[2rem]">
            <ShieldCheck className="w-8 h-8 text-zinc-800 mb-4" />
            <span className="text-zinc-700 text-[10px] font-black uppercase italic tracking-[0.5em]">
              No intelligence found in sector {genreName}
            </span>
          </div>
        )}
      </div>
    </main>
  );
}
