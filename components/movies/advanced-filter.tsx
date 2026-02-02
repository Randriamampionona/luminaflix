"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ListFilter, X, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const GENRES = [
  { id: "all", name: "All Genres" },
  { id: "28", name: "Action" },
  { id: "12", name: "Adventure" },
  { id: "16", name: "Animation" },
  { id: "35", name: "Comedy" },
  { id: "878", name: "Sci-Fi" },
];

const YEARS = ["All", "2026", "2025", "2024", "2023", "Older"];

export default function AdvancedFilter() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tempGenre, setTempGenre] = useState(
    searchParams.get("genre") || "all",
  );
  const [tempYear, setTempYear] = useState(searchParams.get("year") || "All");

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("genre", tempGenre);
    params.set("year", tempYear);
    params.set("page", "1");
    router.push(`/movies?${params.toString()}`);
    setOpen(false);
  };

  const reset = () => {
    setTempGenre("all");
    setTempYear("All");
    router.push("/movies");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 border border-white/5 rounded-full text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white hover:border-cyan-500/50 transition-all shadow-xl outline-none">
          <ListFilter className="w-4 h-4 text-cyan-500" />
          Filters
        </button>
      </DialogTrigger>

      {/* Styled to match your exact spec */}
      <DialogContent className="sm:max-w-100 bg-zinc-950/95 border-white/10 p-8 backdrop-blur-2xl rounded-md ring-1 ring-white/5 shadow-2xl z-100">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-8">
          <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter text-white">
            Refine<span className="text-cyan-500">.</span>
          </DialogTitle>
          {/* Shadcn Dialog includes its own close button, but we can keep it hidden or use yours */}
        </DialogHeader>

        <div className="space-y-8">
          {/* Genre Section */}
          <section>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-4">
              Genres
            </p>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setTempGenre(g.id)}
                  className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all border outline-none ${
                    tempGenre === g.id
                      ? "bg-cyan-500 border-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                      : "bg-zinc-900/50 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </section>

          {/* Year Section */}
          <section>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-4">
              Release Year
            </p>
            <div className="flex flex-wrap gap-2">
              {YEARS.map((y) => (
                <button
                  key={y}
                  onClick={() => setTempYear(y)}
                  className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all border outline-none ${
                    tempYear === y
                      ? "bg-cyan-500 border-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                      : "bg-zinc-900/50 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="mt-10 flex gap-3">
          <button
            onClick={reset}
            className="p-4 bg-zinc-900 rounded-2xl text-zinc-500 hover:text-white transition-colors border border-white/5 active:scale-90"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={applyFilters}
            className="flex-1 bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-cyan-500 hover:text-white transition-all shadow-lg active:scale-95"
          >
            Apply Selection
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
