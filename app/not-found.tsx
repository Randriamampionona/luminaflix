"use client";

import { MoveLeft, Construction, Zap, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

export default function NotFound() {
  const [glitch, setGlitch] = useState(false);

  // Subtle glitch effect trigger
  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 200);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* BACKGROUND DECORATION */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      </div>

      {/* SCANLINE EFFECT */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[100%_4px] pointer-events-none" />

      <div className="relative z-10 text-center space-y-8 max-w-2xl">
        {/* ICON BLOCK */}
        <div className="relative inline-block lg:hidden">
          <div className="absolute inset-0 bg-cyan-500 blur-2xl opacity-20 animate-pulse" />
          <div className="relative bg-zinc-900 border border-white/10 p-6 rounded-[2.5rem] shadow-2xl">
            <Construction
              className={`w-12 h-12 text-cyan-500 transition-transform duration-75 ${glitch ? "translate-x-1" : "translate-x-0"}`}
            />
          </div>
          <div className="absolute -top-2 -right-2 bg-red-500 p-1.5 rounded-lg">
            <ShieldAlert className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* TEXT CONTENT */}
        <div className="space-y-4">
          <h1
            className={`text-6xl md:text-8xl font-black uppercase italic tracking-tighter leading-none text-white transition-all ${glitch ? "skew-x-6 opacity-50" : ""}`}
          >
            404<span className="text-cyan-500">.</span>
          </h1>

          <div className="space-y-2">
            <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-white">
              Archive Under Construction
            </h2>
            <p className="text-zinc-500 text-xs md:text-sm font-bold uppercase tracking-[0.4em] max-w-md mx-auto leading-relaxed">
              Section <span className="text-zinc-300">#Alpha-7</span> is
              currently being recalibrated. Please return to the main terminal.
            </p>
          </div>
        </div>

        {/* PROGRESS BAR SIMULATION */}
        <div className="w-48 h-1 bg-zinc-900 mx-auto rounded-full overflow-hidden border border-white/5">
          <div className="h-full bg-cyan-500 w-1/3 animate-[loading_2s_ease-in-out_infinite]" />
        </div>

        {/* ACTION BUTTON */}
        <div className="pt-8">
          <a
            href="/"
            className="group relative inline-flex items-center gap-3 px-10 py-5 bg-white rounded-2xl transition-all hover:scale-105 active:scale-95 overflow-hidden"
          >
            <div className="absolute inset-0 bg-linear-to-r from-white via-cyan-100 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <MoveLeft className="relative z-10 w-5 h-5 text-black group-hover:-translate-x-1 transition-transform" />
            <span className="relative z-10 text-black font-black uppercase italic tracking-tighter text-sm">
              Back to Command
            </span>
          </a>
        </div>
      </div>

      {/* FOOTER STATUS */}
      <div className="absolute bottom-12 left-0 w-full flex justify-center gap-12 opacity-30">
        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3 text-cyan-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            System: Active
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Core: Updating
          </span>
        </div>
      </div>

      <style jsx>{`
        @keyframes loading {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(200%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </main>
  );
}
