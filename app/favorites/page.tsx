import { getUserFavorites } from "@/action/get-favorites.action";
import FavoriteCard from "@/components/favorite-card";
import { FolderLock, PlusCircle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{
    display_lang?: string;
  }>;
}) {
  const { display_lang } = await searchParams;
  const data = await getUserFavorites(display_lang);

  return (
    <div className="min-h-screen bg-black pt-32 pb-20 px-6 md:px-16 text-white selection:bg-cyan-500/30">
      <div className="max-w-7xl mx-auto">
        {/* HEADER SECTION */}
        <div className="relative mb-16 space-y-6">
          <div className="flex items-center gap-4 group">
            <div className="h-0.5 w-12 bg-cyan-500 shadow-[0_0_15px_#06b6d4]" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-500 italic">
              Authenticated Access Only
            </span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="space-y-2">
              <h1 className="text-7xl md:text-8xl font-black uppercase italic tracking-tighter leading-none">
                My{" "}
                <span className="text-white/10 group-hover:text-white/20 transition-colors">
                  Vault
                </span>
                <span className="text-cyan-500 animate-pulse">.</span>
              </h1>
              <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px] flex items-center gap-2">
                <FolderLock className="w-3 h-3" />
                {data.total_results} Assets Secured in Cloud
              </p>
            </div>

            {/* QUICK STATS / ACTIONS */}
            {data.results.length > 0 && (
              <div className="hidden lg:block">
                <div className="px-6 py-4 rounded-2xl border border-white/5 bg-white/2 backdrop-blur-sm">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">
                    Last Update
                  </p>
                  <p className="text-xs font-bold italic uppercase text-cyan-500">
                    {new Date().toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RESULTS GRID */}
        {data.results.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {data.results.map((item: any) => (
              <FavoriteCard
                key={`${item.id}-${item.savedSeason}-${item.savedEpisode}`}
                item={item}
              />
            ))}
          </div>
        ) : (
          /* EMPTY STATE - PRO STYLING */
          <div className="relative group flex flex-col items-center justify-center py-48 border border-dashed border-white/10 rounded-[3rem] bg-white/1 overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/5 blur-[100px] rounded-full" />

            <div className="relative z-10 text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-3xl border border-white/10 flex items-center justify-center bg-white/3 rotate-12 group-hover:rotate-0 transition-transform duration-500">
                <PlusCircle className="w-10 h-10 text-zinc-800 group-hover:text-cyan-500 transition-colors" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-black uppercase italic tracking-tighter">
                  Vault is Empty
                </h2>
                <p className="text-zinc-600 font-bold uppercase tracking-[0.3em] text-[10px] max-w-50 mx-auto">
                  No media has been assigned to your personal library.
                </p>
              </div>

              <Link
                href="/movies"
                className="inline-flex items-center gap-3 px-8 py-4 bg-white text-black font-black uppercase italic text-xs rounded-full hover:bg-cyan-500 transition-all duration-300 active:scale-95"
              >
                Start Exploring
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER DECORATION */}
      <div className="max-w-7xl mx-auto mt-20 pt-10 border-t border-white/5 flex justify-between items-center">
        <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-[0.5em]">
          Lumina Protocol v2.0
        </p>
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-zinc-800" />
          ))}
        </div>
      </div>
    </div>
  );
}
