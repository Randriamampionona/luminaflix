export default function SignalMonitor() {
  return (
    <div className="mt-4 group relative overflow-hidden bg-zinc-900/40 border border-white/5 rounded-2xl p-4 transition-all duration-500 hover:border-amber-500/30">
      {/* Ambient Warning Background Glow */}
      <div className="absolute -left-10 -top-10 w-32 h-32 bg-amber-500/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-amber-500/10 transition-colors" />

      <div className="relative flex items-center gap-4">
        {/* Status Icon */}
        <div className="shrink-0 relative">
          <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
          </div>
        </div>

        {/* Text Content */}
        <div className="flex flex-col gap-0.5">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/90">
            Signal Integrity Advisory
          </h4>
          <p className="text-[11px] font-medium text-zinc-400 leading-relaxed uppercase tracking-wide">
            If the current stream is{" "}
            <span className="text-zinc-200">unavailable</span> or{" "}
            <span className="text-zinc-200">buffering</span>, please toggle
            between available
            <span className="text-white ml-1 px-1.5 py-0.5 bg-white/5 rounded-md border border-white/10 italic">
              High-Speed Servers
            </span>{" "}
            below.
          </p>
        </div>

        {/* Server ID Tag (Decorative) */}
        <div className="hidden md:flex ml-auto items-center gap-2 px-3 py-1.5 bg-black/40 border border-white/5 rounded-lg">
          <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-tighter">
            Status
          </span>
          <span className="text-[8px] font-mono text-cyan-500 uppercase font-black">
            Multi_Source_Active
          </span>
        </div>
      </div>
    </div>
  );
}
