import { getAllKDramas } from "@/action/get-all-kdramas.action";
import KDramaSearch from "@/components/kdrama-search";
import MovieCard from "@/components/movie-card";
import Pagination from "@/components/movies/pagination";

export default async function KDramaPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    display_lang?: string;
  }>;
}) {
  const { page: rawPage, display_lang } = await searchParams;

  const page = Number(rawPage) || 1;
  const data = await getAllKDramas(
    page,
    "popularity.desc",
    "all",
    "All",
    display_lang,
  );

  return (
    <div className="min-h-screen bg-black pt-32 pb-20 px-8 md:px-16 text-white">
      {/* Header Section - Mirrored from Movies Page */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-20">
        <div className="space-y-2">
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">
            Lumina <span className="text-white/20">K-Drama</span>
            <span className="text-cyan-500">.</span>
          </h1>
          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-cyan-500" />
            <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px]">
              {data.total_results.toLocaleString()} Seoul Signals Locked
            </p>
          </div>
        </div>

        <div className="w-full max-w-sm self-start lg:self-end">
          <KDramaSearch />
        </div>
      </div>

      {/* Results Grid - Clean 6-Column Layout */}
      {data.results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-12">
          {data.results.map((drama) => (
            <MovieCard
              key={drama.id}
              movie={{
                ...drama,
                title:
                  drama.name +
                  (drama.original_name ? ` (${drama.original_name})` : ""),
              }}
              type="tv"
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-40 border border-dashed border-white/10 rounded-3xl">
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">
            No Korean series found
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
