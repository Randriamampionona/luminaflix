import { getNewAndPopular } from "@/action/get-new-popular.action";
import MovieCard from "@/components/movie-card";
import AdvancedFilter from "@/components/movies/advanced-filter";
import Pagination from "@/components/movies/pagination";

export default async function NewPopularPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    genre?: string;
    year?: string;
  }>;
}) {
  const {
    page: rawPage,
    genre: genreId = "all",
    year = "All",
  } = await searchParams;

  const page = Number(rawPage) || 1;

  // Fetch New & Popular data
  const data = await getNewAndPopular(page, genreId, year);

  return (
    <div className="min-h-screen bg-black pt-32 pb-20 px-8 md:px-16 text-white">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-10 space-y-20">
        <div className="space-y-2">
          <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter leading-none">
            Hot <span className="text-white/20">Trending</span>
            <span className="text-cyan-500">.</span>
          </h1>
          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-cyan-500" />
            <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px]">
              What&apos;s buzzing right now on Lumina
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start lg:self-end">
          <AdvancedFilter />
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
            No trending titles found
          </p>
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
