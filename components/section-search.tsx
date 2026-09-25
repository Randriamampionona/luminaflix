"use client";

import { Search, Terminal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Replaces the duplicated AnimeSearch / KDramaSearch components. */
export default function SectionSearch({
  basePath,
  placeholder,
  submitLabel,
}: {
  basePath: "/anime/search" | "/k-drama/search";
  placeholder: string;
  submitLabel: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = query.trim();
    if (value) router.push(`${basePath}/${encodeURIComponent(value)}`);
  };

  return (
    <form onSubmit={handleSubmit} role="search" className="group relative w-full max-w-sm">
      <div aria-hidden className="absolute -inset-1 rounded-2xl bg-cyan-500/20 opacity-0 blur-md transition-opacity duration-500 group-focus-within:opacity-100" />
      <div className="relative flex items-center rounded-2xl border border-white/5 bg-zinc-900/50 px-4 py-3 backdrop-blur-xl transition-colors group-focus-within:border-cyan-500/50">
        <Terminal className="mr-3 h-4 w-4 text-cyan-500" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full border-none bg-transparent text-[10px] font-black uppercase tracking-[0.2em] text-white outline-none placeholder:text-zinc-600"
        />
        <button type="submit" aria-label={submitLabel} className="ml-2 transition-transform hover:scale-110">
          <Search className="h-4 w-4 text-zinc-400 group-focus-within:text-cyan-500" />
        </button>
      </div>
    </form>
  );
}
