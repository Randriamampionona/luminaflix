import {
  X,
  ShieldAlert,
  ChevronLeft,
  MonitorPlay,
  Cpu,
  Binary,
  Globe,
} from "lucide-react";
import { getMovieTrailer } from "@/action/get-movie-trailer.action";
import CustomLink from "@/components/custom-link";

export default async function TrailerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    type?: string;
    fallback?: string;
    lang?: string;
    display_lang?: string;
  }>;
}) {
  const { id } = await params;
  const { type, fallback, lang, display_lang } = await searchParams;

  const trailerData = await getMovieTrailer(id, lang, type, display_lang);
  const currentLang = trailerData?.lang === "fr" ? "fr" : "en";
  const nextLang = currentLang === "fr" ? "en" : "fr";

  const baseRoute =
    type === "anime" ? "/anime" : type === "tv" ? "/k-drama" : "/movies";
  const watchLink = `${baseRoute}/${id}?fallback=${fallback}`;

  return (
    <div className="relative min-h-screen bg-[#020202] text-white font-geist overflow-x-hidden selection:bg-cyan-500/30">
      {/* 1. TOP NAVIGATION HUD */}
      <header className="w-full max-w-6xl mx-auto mt-32 p-6 md:p-10 flex items-center justify-between bg-linear-to-b from-[#020202] to-transparent">
        <CustomLink href="/" className="flex items-center gap-6 group">
          <div className="p-2 border border-white/10 rounded-xl group-hover:border-cyan-500 transition-all group-hover:bg-cyan-500/5">
            <ChevronLeft className="w-5 h-5 text-zinc-600 group-hover:text-cyan-500" />
          </div>
          <div className="flex flex-col border-l border-white/10 pl-6 space-y-1">
            <span className="text-[12px] font-black uppercase tracking-[0.6em] text-white">
              LUMINA//CORE
            </span>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
              <span className="text-[8px] text-zinc-600 uppercase font-black tracking-[0.2em]">
                System: Secure
              </span>
            </div>
          </div>
        </CustomLink>

        <div className="flex items-center gap-12">
          <div className="hidden lg:flex items-center gap-12">
            <div className="flex flex-col items-end gap-1">
              <span className="text-[7px] text-zinc-600 uppercase font-black tracking-[0.3em]">
                Sector
              </span>
              <span className="text-[10px] text-white font-mono uppercase tracking-widest">
                {type || "01"}
              </span>
            </div>
            <div className="flex flex-col items-end gap-1 text-right">
              <span className="text-[7px] text-zinc-600 uppercase font-black tracking-[0.3em]">
                Node_ID
              </span>
              <span className="text-[10px] text-cyan-500 font-mono uppercase">
                {id.slice(0, 8)}
              </span>
            </div>
          </div>
          <CustomLink
            href="/"
            className="group p-2 bg-white/5 rounded-full hover:bg-red-500/10 transition-colors"
          >
            <X className="w-6 h-6 text-zinc-700 group-hover:text-red-500 group-hover:rotate-90 transition-all duration-300" />
          </CustomLink>
        </div>
      </header>

      {/* 2. MAIN MISSION CENTER */}
      <main className="w-full flex flex-col items-center mb-32 px-6">
        <div className="w-full max-w-6xl relative">
          {/* THE PLAYER (Updated Rounding) */}
          <div className="relative aspect-video w-full overflow-hidden bg-black border border-white/5 shadow-[0_0_80px_-20px_rgba(6,182,212,0.15)] transition-all duration-700">
            {trailerData?.key ? (
              <iframe
                src={`https://www.youtube.com/embed/${trailerData.key}?autoplay=1&rel=0&modestbranding=1&hl=${currentLang}`}
                className="w-full h-full grayscale-[0.1] contrast-[1.05]"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 bg-[#050505]">
                <ShieldAlert className="w-10 h-10 text-zinc-800" />
                <span className="text-[9px] font-black uppercase tracking-[0.5em] text-zinc-700 underline decoration-red-900 underline-offset-8">
                  Signal Encryption Failure
                </span>
              </div>
            )}

            {/* AMBIENT CRT OVERLAY */}
            <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-size-[100%_2px,3px_100%]" />
          </div>

          {/* LOWER HUD MODULES (Updated Rounding & Layout) */}
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* MODULE A: ENGINE DATA */}
            <div className="lg:col-span-3 p-8 bg-white/2 border border-white/5 rounded-[2rem] flex flex-col justify-between group backdrop-blur-sm">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Cpu className="w-4 h-4 text-cyan-500" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-cyan-500 transition-colors">
                    Processor_01
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[7px] font-black text-zinc-500 uppercase">
                    <span>Buffer</span>
                    <span>98%</span>
                  </div>
                  <div className="h-0.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 w-[98%] animate-pulse" />
                  </div>
                </div>
              </div>
            </div>

            {/* MODULE B: MAIN ACTION (WATCH) */}
            <div className="lg:col-span-6 p-8 bg-white/5 border border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center gap-6 shadow-xl shadow-cyan-500/5">
              <CustomLink
                href={watchLink}
                className="group relative w-full py-6 bg-white text-black rounded-2xl flex items-center justify-center gap-4 transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] active:scale-[0.98]"
              >
                <MonitorPlay className="w-5 h-5" />
                <span className="text-xs font-black uppercase tracking-[0.4em]">
                  Start Watching
                </span>
              </CustomLink>
              <div className="flex items-center gap-3">
                <Binary className="w-3 h-3 text-cyan-500" />
                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-zinc-500">
                  Secure Playback Authorized
                </span>
              </div>
            </div>

            {/* MODULE C: LOCALE OVERRIDE */}
            <div className="lg:col-span-3 p-8 bg-white/2 border border-white/5 rounded-[2rem] flex flex-col items-center justify-center gap-6 backdrop-blur-sm">
              <CustomLink
                href={`/trailer/${id}?lang=${nextLang}&type=${type}&fallback=${fallback}`}
                className="w-full py-3 border border-white/10 rounded-xl text-center text-[9px] font-black uppercase tracking-widest hover:border-cyan-500 hover:bg-cyan-500/5 hover:text-cyan-500 transition-all"
              >
                Switch to {nextLang.toUpperCase()}
              </CustomLink>
              <div className="flex items-center gap-4">
                <Globe className="w-3 h-3 text-zinc-700" />
                <span className="text-[9px] font-black text-white uppercase tracking-widest">
                  {currentLang} / VO
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* BACKGROUND SCENE */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] contrast-150" />
        <div className="absolute top-0 left-0 w-full h-1/2 bg-linear-to-b from-cyan-950/10 to-transparent" />
      </div>
    </div>
  );
}
