import { getAllGenres } from "@/action/get-all-genres.action";
import { ChevronRight, Hash } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import CustomLink from "@/components/custom-link";

export default async function AllGenresPage({
  searchParams,
}: {
  searchParams: Promise<{ display_lang?: string }>;
}) {
  const { display_lang } = await searchParams;
  const genres = await getAllGenres({ display_lang });

  return (
    <main className="min-h-screen pt-32 pb-20 px-6 md:px-12 bg-black text-white">
      <div className="max-w-400 mx-auto">
        {/* HEADER SECTION */}
        <div className="relative mb-24">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-px w-12 bg-cyan-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-cyan-500">
              System Directory
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">
            GENRE<span className="text-cyan-500">.</span>MAP
          </h1>
        </div>

        {/* THE GRID UI WITH IMAGES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 border-l gap-2 border-t border-white/5">
          {genres.map((genre, index) => (
            <CustomLink
              key={genre.id}
              href={`/genres/${genre.id}`}
              className="group relative aspect-video md:aspect-square flex flex-col justify-between p-8 border-r border-b border-white/5 bg-zinc-950 overflow-hidden transition-all duration-700"
            >
              {/* BACKDROP IMAGE */}
              {genre.backdrop && (
                <div className="absolute inset-0 z-0">
                  <Image
                    src={`https://image.tmdb.org/t/p/w500${genre.backdrop}`}
                    alt={genre.name}
                    fill
                    className="object-cover opacity-20 grayscale group-hover:grayscale-0 group-hover:opacity-40 group-hover:scale-110 transition-all duration-1000 ease-out"
                  />
                  {/* GRADIENT OVERLAYS */}
                  <div className="absolute inset-0 bg-black/60 group-hover:bg-black/20 transition-colors duration-700" />
                  <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent" />
                </div>
              )}

              {/* NUMBERING */}
              <div className="relative z-10 flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Hash className="w-3 h-3 text-cyan-500 opacity-50" />
                  <span className="text-[10px] font-mono text-zinc-500 group-hover:text-cyan-500 transition-colors">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:border-cyan-500 group-hover:bg-cyan-500 transition-all duration-500 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                  <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-black" />
                </div>
              </div>

              {/* MAIN CONTENT */}
              <div className="relative z-10">
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500 group-hover:text-cyan-400 transition-colors">
                  Initialize Sector
                </span>
                <h3 className="text-4xl font-black uppercase italic tracking-tighter mt-2 group-hover:translate-x-2 transition-transform duration-500 wrap-break-word">
                  {genre.name}
                </h3>
              </div>

              {/* SCANLINE DECORATION */}
              <div className="absolute bottom-0 left-0 w-full h-1 bg-cyan-500 -translate-x-full group-hover:translate-x-0 transition-transform duration-700 ease-in-out" />
            </CustomLink>
          ))}
        </div>

        {/* FOOTER DATA */}
        <div className="mt-12 flex justify-between items-center border-t border-white/5 pt-8">
          <div className="flex gap-12">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                Active Sectors
              </span>
              <span className="text-2xl font-black italic">
                {genres.length}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                Database
              </span>
              <span className="text-2xl font-black italic text-cyan-500 underline decoration-2 underline-offset-4">
                Live
              </span>
            </div>
          </div>
          <div className="hidden md:block font-mono text-[10px] text-zinc-800 animate-pulse">
            {`// SYSTEM_READY_LOADING_ASSETS...`}
          </div>
        </div>
      </div>
    </main>
  );
}
