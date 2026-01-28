"use client";

import { Search, Command, Loader2, ArrowRight, Zap, Film } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import Link from "next/link";

// TMDB Genre IDs mapped to your specific list
const GENRE_FILTERS = [
  { id: "28", name: "Action" },
  { id: "16", name: "Animation" },
  { id: "99", name: "Documentaire" },
  { id: "18", name: "Drame" },
  { id: "27", name: "Horreur" },
  { id: "10751", name: "Famille" },
  { id: "14", name: "Fantastique" },
  { id: "36", name: "Historique" },
  { id: "10402", name: "Musical" },
  { id: "878", name: "SF" },
  { id: "53", name: "Thriller" },
  { id: "37", name: "Western" },
  { id: "9648", name: "Mystère" },
];

export default function SearchHub() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const executeNavigation = (path: string) => {
    setIsSearching(true);
    setTimeout(() => {
      router.push(path);
      setOpen(false);
      setIsSearching(false);
      setQuery("");
    }, 500);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    executeNavigation(`/search/${encodeURIComponent(query.trim())}`);
  };

  const handleGenreClick = (id: string, name: string) => {
    // Navigate with genre parameter
    executeNavigation(`/search/${name.toLowerCase()}?genre=${id}`);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group relative flex items-center gap-4 px-4 py-2 bg-zinc-900/40 border border-white/5 rounded-2xl hover:border-cyan-500/50 hover:bg-zinc-900 transition-all duration-500"
      >
        <Search className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 group-hover:text-zinc-400">
          Search Archives
        </span>
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/40 border border-white/5 text-[9px] font-bold text-zinc-700 group-hover:text-cyan-500 transition-colors">
          <Command className="w-2.5 h-2.5" /> K
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl bg-black/80 backdrop-blur-3xl border-white/10 p-0 overflow-hidden shadow-[0_0_100px_rgba(6,182,212,0.2)] rounded-md outline-none z-100">
          <DialogTitle className="sr-only">Lumina Command Center</DialogTitle>

          <form onSubmit={handleSearch} className="relative">
            <div className="absolute top-8 left-8">
              {isSearching ? (
                <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
              ) : (
                <Search className="w-6 h-6 text-zinc-700" />
              )}
            </div>

            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="QUERY DATABASE..."
              className="w-full bg-transparent border-none outline-none pt-12 pb-10 px-8 pl-20 text-3xl font-black uppercase italic tracking-tighter text-white placeholder:text-zinc-900"
            />
          </form>

          {/* CATEGORY GRID */}
          <div className="px-8 pb-8">
            <div className="flex items-center gap-2 mb-4">
              <Film className="w-3 h-3 text-cyan-500" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500">
                Categorical Access
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {GENRE_FILTERS.map((genre) => (
                <button
                  key={genre.id}
                  onClick={() => handleGenreClick(genre.id, genre.name)}
                  className="group/item relative flex flex-col p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white hover:border-white transition-all duration-300 overflow-hidden"
                >
                  <span className="relative z-10 text-[9px] font-black uppercase tracking-widest text-zinc-500 group-hover/item:text-black transition-colors">
                    {genre.name}
                  </span>
                  <div className="absolute bottom-0 right-0 p-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <ArrowRight className="w-3 h-3 text-black" />
                  </div>
                </button>
              ))}
              <Link href="/genres">
                <button className="group/item relative flex flex-col p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white hover:border-white transition-all duration-300 overflow-hidden">
                  <span className="relative z-10 text-[9px] font-black uppercase tracking-widest text-zinc-500 group-hover/item:text-black transition-colors">
                    See all...
                  </span>
                  <div className="absolute bottom-0 right-0 p-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <ArrowRight className="w-3 h-3 text-black" />
                  </div>
                </button>
              </Link>
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex items-center justify-between px-8 py-5 bg-zinc-950/50 border-t border-white/5">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                  Lumina Indexer v4.0
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[9px] font-bold text-zinc-700">
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/5 text-zinc-500">
                ESC
              </kbd>
              <span>TO ABORT</span>
            </div>
          </div>

          {/* ACTIVE SEARCH OVERLAY */}
          {query.length > 0 && !isSearching && (
            <div className="absolute top-21 left-20 right-8 pointer-events-none">
              <div className="flex items-center gap-2 text-cyan-500 animate-in fade-in slide-in-from-left-2">
                <Zap className="w-3 h-3 fill-current" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Execute Global Search for "{query}"
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
