import { getSearchResults } from "@/action/get-search-results.action";
import MovieCard from "@/components/movie-card";
import { Search, Sparkles } from "lucide-react";

export default async function SearchPage({
  params,
}: {
  params: Promise<{ query: string }>;
}) {
  const { query } = await params;
  const decodedQuery = decodeURIComponent(query);
  const results = await getSearchResults(decodedQuery);

  return (
    <main className="min-h-screen bg-black pt-32 pb-20 px-8 md:px-16">
      <div className="max-w-350 mx-auto space-y-12">
        {/* Search Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-xl">
                <Search className="w-5 h-5 text-cyan-500" />
              </div>
              <span className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">
                Search Results
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-white uppercase italic tracking-tighter leading-none wrap-break-word">
              &ldquo;{decodedQuery}&rdquo;
              <span className="text-cyan-500">.</span>
            </h1>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/40 rounded-full border border-white/5">
            <Sparkles className="w-3 h-3 text-cyan-500" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              {results.length} Matches Found
            </span>
          </div>
        </div>

        {/* Results Grid */}
        {results.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
            {results.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : (
          <div className="py-40 flex flex-col items-center justify-center space-y-6 text-center">
            <div className="w-20 h-20 bg-zinc-900 rounded-[2.5rem] flex items-center justify-center border border-white/5">
              <Search className="w-8 h-8 text-zinc-700" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black uppercase italic tracking-tight text-white">
                No Data Found
              </h3>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">
                The archive does not contain records for this query.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
