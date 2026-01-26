"use client";

import { Search, ArrowRight } from "lucide-react";
import { useState } from "react";

export default function NavbarActions() {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="flex items-center gap-6">
      {/* PRO SEARCH BAR */}
      <div
        className={`relative flex items-center transition-all duration-500 ease-out rounded-2xl border ${
          isFocused
            ? "w-72 bg-zinc-900 border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.15)]"
            : "w-64 bg-zinc-900/40 border-white/5 hover:border-white/20"
        }`}
      >
        <div className="pl-4">
          <Search
            className={`w-4 h-4 transition-colors duration-300 ${isFocused ? "text-cyan-400" : "text-zinc-500"}`}
          />
        </div>
        <input
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          type="text"
          placeholder="Titles, people, genres..."
          className="w-full bg-transparent border-none outline-none text-[11px] font-bold uppercase tracking-wider text-white px-3 py-3 placeholder:text-zinc-600"
        />
        {/* Keyboard Shortcut Hint */}
        {!isFocused && (
          <div className="absolute right-3 px-1.5 py-0.5 rounded border border-white/10 bg-black/20 text-[9px] font-black text-zinc-600">
            ⌘K
          </div>
        )}
      </div>

      <div className="h-6 w-px bg-white/10 hidden lg:block" />

      {/* AUTH CTAs */}
      <div className="flex items-center gap-2">
        <button className="hidden sm:block px-5 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all">
          Sign In
        </button>

        {/* THE "JOIN" CTA - SHARP & GLOWING */}
        <button className="group relative flex items-center gap-2 px-6 py-3 bg-white overflow-hidden rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_10px_20px_rgba(255,255,255,0.1)] hover:shadow-cyan-500/40">
          {/* Animated Gradient Background on Hover */}
          <div className="absolute inset-0 bg-linear-to-r from-white via-cyan-100 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <span className="relative z-10 text-black font-black uppercase italic tracking-tighter text-sm">
            Join Lumina
          </span>
          <ArrowRight className="relative z-10 w-4 h-4 text-black group-hover:translate-x-1 transition-transform" />

          {/* Subtle Glow Ring */}
          <div className="absolute inset-0 rounded-xl border border-white/50 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>
    </div>
  );
}
