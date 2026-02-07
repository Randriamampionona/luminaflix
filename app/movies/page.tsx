import { getAllMovies } from "@/action/get-all-movies.action";
import MovieCard from "@/components/movie-card";
import AdvancedFilter from "@/components/movies/advanced-filter";
import Pagination from "@/components/movies/pagination";
import SortDropdown from "@/components/movies/sort-dropdown";

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    sort?: string;
    genre?: string;
    year?: string;
  }>;
}) {
  // 1. Unwrap all search parameters (Next.js 15 Async API)
  const {
    page: rawPage,
    sort: sortBy = "primary_release_date.desc",
    genre: genreId = "all",
    year = "All",
  } = await searchParams;

  const page = Number(rawPage) || 1;

  // 2. Fetch data with all filters active
  const data = await getAllMovies(page, sortBy, genreId, year);

  return (
    <div className="min-h-screen bg-black pt-32 pb-20 px-8 md:px-16 text-white">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-10 space-y-20">
        <div className="space-y-2">
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">
            Lumina <span className="text-white/20">Libs</span>
            <span className="text-cyan-500">.</span>
          </h1>
          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-cyan-500" />
            <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px]">
              {data.total_results.toLocaleString()} Global Series
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start lg:self-end">
          {/* Note: In a real app, you'd pass a "type" prop to filter if the genre IDs differ */}
          <AdvancedFilter />
          <div className="w-px h-6 bg-white/10 mx-1" />
          <SortDropdown />
        </div>
      </div>

      {/* Results Grid */}
      {data.results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-12">
          {data.results.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-40 border border-dashed border-white/10 rounded-3xl">
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">
            No movies found matching these filters
          </p>
          <button className="mt-4 text-cyan-500 font-black uppercase italic text-xs hover:underline">
            Reset Filters
          </button>
        </div>
      )}

      {/* Pagination Footer */}
      {data.results.length > 0 && (
        <div className="mt-20 border-t border-white/5 pt-10">
          <Pagination currentPage={page} totalPages={data.total_pages} />
        </div>
      )}
    </div>
  );
}
