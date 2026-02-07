import MovieCard from "@/components/movie-card";
import { ChevronLeft } from "lucide-react";
import { getSearchKDramas } from "@/action/get-search-kdrama.action";
import CustomLink from "@/components/custom-link";

export default async function KDramaSearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ query: string }>;
  searchParams: Promise<{ page?: string; display_lang?: string }>;
}) {
  const { query } = await params;
  const { page, display_lang } = await searchParams;
  const decodedQuery = decodeURIComponent(query);
  const data = await getSearchKDramas(
    decodedQuery,
    Number(page) || 1,
    display_lang,
  );

  return (
    <div className="min-h-screen bg-black pt-32 pb-20 px-8 md:px-16 text-white">
      {/* Search Header */}
      <div className="space-y-8 mb-16">
        <CustomLink
          href="/k-drama"
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-cyan-500 transition-all group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest">
            Return to Base
          </span>
        </CustomLink>

        <div className="space-y-2">
          <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none">
            Results <span className="text-white/20">for</span> {decodedQuery}
            <span className="text-cyan-500">.</span>
          </h1>
          <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px]">
            {data.results.length} Matches Identified in the Korean Sector
          </p>
        </div>
      </div>

      {/* Grid - Exact same as KDramaPage */}
      {data.results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-12">
          {data.results.map((drama: any) => (
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
            Signal Lost: No Dramas found for "{decodedQuery}"
          </p>
          <CustomLink
            href="/k-drama"
            className="mt-4 text-cyan-500 font-black uppercase italic text-xs hover:underline"
          >
            Try a Different Frequency
          </CustomLink>
        </div>
      )}
    </div>
  );
}
