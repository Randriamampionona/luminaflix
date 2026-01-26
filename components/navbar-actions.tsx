"use client";

import { Search, ArrowRight } from "lucide-react";
import { useState } from "react";

export default function NavbarActions() {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="flex items-center gap-3 md:gap-6">
      {/* SEARCH BAR - Collapses on mobile */}
      <div
        className={`relative hidden md:flex items-center transition-all duration-500 ease-out rounded-2xl border ${
          isFocused
            ? "w-72 bg-zinc-900 border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.15)]"
            : "w-64 bg-zinc-900/40 border-white/5 hover:border-white/20"
        }`}
      >
        <div
          className={`flex items-center justify-center ${isFocused ? "pl-4" : "w-10 md:pl-4 md:w-auto"}`}
        >
          <Search
            className={`w-4 h-4 transition-colors ${isFocused ? "text-cyan-400" : "text-zinc-500"}`}
          />
        </div>

        <input
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          type="text"
          placeholder="Search..."
          className={`bg-transparent border-none outline-none text-[11px] font-bold uppercase tracking-wider text-white py-3 placeholder:text-zinc-600 transition-all ${
            isFocused
              ? "w-full px-3"
              : "w-0 md:w-full md:px-3 opacity-0 md:opacity-100"
          }`}
        />

        {!isFocused && (
          <div className="absolute right-3 px-1.5 py-0.5 rounded border border-white/10 bg-black/20 text-[9px] font-black text-zinc-600 hidden md:block">
            ⌘K
          </div>
        )}
      </div>

      <div className="h-6 w-px bg-white/10 hidden sm:block" />

      {/* AUTH CTA - Text hidden on tiny screens */}
      <div className="flex items-center gap-2">
        <button className="hidden lg:block px-4 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white">
          Sign In
        </button>

        <button className="group relative flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-white overflow-hidden rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-cyan-500/40">
          <div className="absolute inset-0 bg-linear-to-r from-white via-cyan-100 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <span className="relative z-10 text-black font-black uppercase italic tracking-tighter text-[10px] md:text-sm whitespace-nowrap">
            {/* Shortened text for mobile */}
            <span className="md:hidden">Join</span>
            <span className="hidden md:inline">Join Lumina</span>
          </span>
          <ArrowRight className="relative z-10 w-3 h-3 md:w-4 md:h-4 text-black group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
