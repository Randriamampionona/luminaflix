import {
  getKDramaDetails,
  getSeasonEpisodes,
} from "@/action/get-kdrama-details.action";
import CustomLink from "@/components/custom-link";
import LuminaDramaPlayer from "@/components/drama-player";
import {
  ChevronLeft,
  Info,
  Terminal,
  Activity,
  Clapperboard,
} from "lucide-react";
import Link from "next/link";

export default async function KDramaPlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ s?: string; e?: string; display_lang?: string }>;
}) {
  const { id } = await params;
  const { s, e, display_lang } = await searchParams;

  const seasonNum = Number(s) || 1;
  const episodeNum = Number(e) || 1;

  // Parallel fetch for speed
  const [drama, episodes] = await Promise.all([
    getKDramaDetails(id, display_lang),
    getSeasonEpisodes(id, seasonNum, display_lang),
  ]);

  // Find the specific episode title from the list
  const currentEpisode = episodes?.find(
    (ep: any) => ep.episode_number === episodeNum,
  );
  const episodeTitle = currentEpisode?.name || `Episode ${episodeNum}`;

  if (!drama)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto" />
          <p className="text-white font-black uppercase tracking-[0.4em] text-xs">
            Signal Lost.
          </p>
        </div>
      </div>
    );

  return (
    <main className="min-h-screen bg-black text-white pb-20 px-6 md:px-12 pt-32 lg:pt-36">
      {/* HEADER SECTION */}
      <div className="max-w-7xl mx-auto mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-6">
            <CustomLink
              href={`/k-drama/${id}`}
              className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-all group"
            >
              <div className="p-2 rounded-full bg-zinc-900 group-hover:bg-cyan-500 group-hover:text-black transition-all">
                <ChevronLeft className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                Abort Mission / Back to Library
              </span>
            </CustomLink>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Terminal className="w-3 h-3 text-cyan-500" />
                <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest">
                  Live Stream Connection Established
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">
                {drama.name}
                <span className="text-cyan-500">.</span>
              </h1>

              {/* NEW: EPISODE TITLE TAGLINE */}
              <div className="flex items-center gap-3 pt-2">
                <Clapperboard className="w-4 h-4 text-zinc-600" />
                <h2 className="text-lg md:text-xl font-bold text-zinc-400 uppercase tracking-tight italic">
                  {episodeTitle}
                </h2>
              </div>
            </div>
          </div>

          {/* Right: Status Indicators */}
          <div className="flex items-center gap-8 self-start md:self-end pb-1">
            <div className="text-right">
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">
                Current Sector
              </p>
              <div className="flex items-center gap-3 bg-zinc-900/50 border border-white/5 px-4 py-2 rounded-2xl">
                <div className="flex flex-col">
                  <span className="text-xs font-black text-white leading-none">
                    S{seasonNum.toString().padStart(2, "0")}
                  </span>
                  <span className="text-[8px] text-zinc-500 font-bold uppercase">
                    Season
                  </span>
                </div>
                <div className="w-px h-6 bg-white/10" />
                <div className="flex flex-col">
                  <span className="text-xs font-black text-cyan-500 leading-none">
                    E{episodeNum.toString().padStart(2, "0")}
                  </span>
                  <span className="text-[8px] text-zinc-500 font-bold uppercase">
                    Episode
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PLAYER COMPONENT */}
      <div className="max-w-7xl mx-auto relative group">
        <div className="absolute -inset-1 bg-cyan-500/20 rounded-[2.6rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000" />
        <div className="relative">
          <LuminaDramaPlayer id={id} season={seasonNum} episode={episodeNum} />
        </div>
      </div>

      {/* FOOTER INFO */}
      <div className="max-w-7xl mx-auto mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-8 bg-zinc-900/20 border border-white/5 rounded-[2.5rem] flex items-start gap-6 backdrop-blur-sm">
          <div className="p-4 bg-cyan-500 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.4)] hidden sm:block">
            <Info className="w-6 h-6 text-black" />
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-500" />
              Transmission Protocol
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed font-medium">
              Source: <span className="text-white">EN_PROVIDERS</span>.
              Currently decrypting{" "}
              <span className="text-white font-bold">{drama.name}</span> —{" "}
              <span className="text-cyan-500 italic font-bold">
                {episodeTitle}
              </span>
              . Subtitles are embedded in the stream signal.
            </p>
          </div>
        </div>

        <div className="p-8 bg-cyan-500/5 border border-cyan-500/10 rounded-[2.5rem] flex flex-col justify-center">
          <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.3em] mb-2 text-center">
            Data Integrity
          </p>
          <div className="flex justify-center items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-6 h-1 bg-cyan-500 rounded-full" />
            ))}
            <span className="text-xs font-black ml-2">100%</span>
          </div>
        </div>
      </div>
    </main>
  );
}
