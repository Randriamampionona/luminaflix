"use client";

import { Search, ArrowRight, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import UserTerminal from "./user-terminal";

export default function NavbarActions() {
  const [isFocused, setIsFocused] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  // 1. Create a reference to the input element
  const inputRef = useRef<HTMLInputElement>(null);

  // 2. Keyboard Shortcut Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault(); // Stop browser search
        inputRef.current?.focus();
        setIsFocused(true);
      }

      // Bonus: Press 'Escape' to close search
      if (e.key === "Escape") {
        inputRef.current?.blur();
        setIsFocused(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    router.push(`/search/${encodeURIComponent(query.trim())}`);
    setIsFocused(false);
    inputRef.current?.blur();
  };

  return (
    <div className="hidden lg:flex items-center gap-3 md:gap-6">
      {/* SEARCH BAR */}
      <form
        onSubmit={handleSearch}
        className={`relative flex items-center transition-all duration-500 ease-out rounded-2xl border ${
          isFocused
            ? "w-72 bg-zinc-900 border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.15)]"
            : "w-10 md:w-64 bg-zinc-900/40 border-white/5 hover:border-white/20"
        }`}
      >
        <button
          type="submit"
          className={`flex items-center justify-center cursor-pointer ${
            isFocused ? "pl-4" : "w-10 md:pl-4 md:w-auto h-10 md:h-auto"
          }`}
        >
          <Search
            className={`w-4 h-4 transition-colors ${
              isFocused ? "text-cyan-400" : "text-zinc-500 hover:text-white"
            }`}
          />
        </button>

        <input
          ref={inputRef} // 3. Attach the ref here
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Delay to allow click events on clear button or submit
            setTimeout(() => setIsFocused(false), 200);
          }}
          type="text"
          placeholder="Search..."
          className={`bg-transparent border-none outline-none text-[11px] font-bold uppercase tracking-wider text-white py-3 placeholder:text-zinc-600 transition-all ${
            isFocused
              ? "w-full px-3"
              : "w-0 md:w-full md:px-3 opacity-0 md:opacity-100 pointer-events-none md:pointer-events-auto"
          }`}
        />

        {/* Shortcut Hint: Dynamic Opacity */}
        <div
          className={`absolute right-3 px-1.5 py-0.5 rounded border border-white/10 bg-black/20 text-[9px] font-black text-zinc-600 hidden md:block transition-opacity duration-300 ${isFocused ? "opacity-0" : "opacity-100"}`}
        >
          ⌘&nbsp;&nbsp;K
        </div>

        {isFocused && query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 p-1 hover:text-white text-zinc-500 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </form>

      {/* Rest of your Auth buttons ... */}
      <div className="h-6 w-px bg-white/10 hidden sm:block" />
      <div className="flex items-center gap-2">
        <SignedOut>
          <Link href="/sign-in">
            <button className="hidden lg:block px-4 py-2.5 text-xs font-black uppercase cursor-pointer tracking-widest text-zinc-400 hover:text-white transition-colors">
              Sign In
            </button>
          </Link>
          <Link href="/sign-up">
            <button className="group relative flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-white cursor-pointer overflow-hidden rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg">
              <span className="relative z-10 text-black font-black uppercase italic tracking-tighter text-[10px] md:text-sm whitespace-nowrap">
                Join Lumina
              </span>
              <ArrowRight className="relative z-10 w-3 h-3 md:w-4 md:h-4 text-black" />
            </button>
          </Link>
        </SignedOut>
        <SignedIn>
          <UserTerminal />
        </SignedIn>
      </div>
    </div>
  );
}
