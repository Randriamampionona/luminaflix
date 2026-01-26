import { getLibrary } from "@/action/get-library.action";
import MovieCard from "@/components/movie-card";
import AdvancedFilter from "@/components/movies/advanced-filter";
import Pagination from "@/components/movies/pagination";
import SortDropdown from "@/components/movies/sort-dropdown";
import { Bookmark, LayoutGrid, Star, History } from "lucide-react";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string; genre?: string }>;
}) {
  const {
    page: rawPage,
    sort: sortBy = "vote_average.desc",
    genre: genreId = "all",
  } = await searchParams;
  const page = Number(rawPage) || 1;
  const data = await getLibrary(page, sortBy, genreId);

  return (
    <div className="min-h-screen bg-black pt-32 pb-20 px-8 md:px-16 text-white">
      {/* 1. THE BENTO HEADER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
        <div className="md:col-span-2 p-10 rounded-[2.5rem] bg-linear-to-br from-zinc-900 to-black border border-white/5 flex flex-col justify-between">
          <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter leading-none">
            Master <span className="text-cyan-500">Archive.</span>
          </h1>
          <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-8 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            Curating {data.total_results.toLocaleString()} Masterpieces
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-6 rounded-[2rem] bg-zinc-900/50 border border-white/5 flex flex-col items-center justify-center gap-3 group hover:border-cyan-500/50 transition-all cursor-pointer">
            <Star className="w-6 h-6 text-cyan-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white">
              Top Rated
            </span>
          </div>
          <div className="p-6 rounded-[2rem] bg-zinc-900/50 border border-white/5 flex flex-col items-center justify-center gap-3 group hover:border-cyan-500/50 transition-all cursor-pointer">
            <Bookmark className="w-6 h-6 text-cyan-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white">
              Watchlist
            </span>
          </div>
          <div className="p-6 rounded-[2rem] bg-zinc-900/50 border border-white/5 flex flex-col items-center justify-center gap-3 group hover:border-cyan-500/50 transition-all cursor-pointer">
            <History className="w-6 h-6 text-cyan-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white">
              History
            </span>
          </div>
          <div className="p-6 rounded-[2rem] bg-zinc-900/50 border border-white/5 flex flex-col items-center justify-center gap-3 group hover:border-cyan-500/50 transition-all cursor-pointer">
            <LayoutGrid className="w-6 h-6 text-cyan-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white">
              Grid View
            </span>
          </div>
        </div>
      </div>

      {/* 2. CONTROL BAR */}
      <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-8">
        <div className="flex items-center gap-4">
          <div className="px-4 py-1.5 bg-cyan-500 rounded-full text-black text-[10px] font-black uppercase tracking-widest">
            All Content
          </div>
          <span className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
            Sorting by Relevance
          </span>
        </div>
        <div className="flex items-center gap-3">
          <AdvancedFilter />
          <SortDropdown />
        </div>
      </div>

      {/* 3. THE GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-12">
        {data.results.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>

      <div className="mt-20">
        <Pagination currentPage={page} totalPages={data.total_pages} />
      </div>
    </div>
  );
}
