"use client";

import { Search, Terminal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function KDramaSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/k-drama/search/${encodeURIComponent(query.trim())}`);
  };

  return (
    <form onSubmit={handleSearch} className="relative group w-full max-w-md">
      <div className="absolute -inset-1 bg-cyan-500/20 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
      <div className="relative flex items-center bg-zinc-900/50 border border-white/5 group-focus-within:border-cyan-500/50 rounded-2xl px-4 py-3 backdrop-blur-xl transition-all">
        <Terminal className="w-4 h-4 text-cyan-500 mr-3" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="SEARCH SEOUL SIGNALS..."
          className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-[0.2em] text-white placeholder:text-zinc-600 w-full"
        />
        <button
          type="submit"
          className="ml-2 hover:scale-110 transition-transform"
        >
          <Search className="w-4 h-4 text-zinc-400 group-focus-within:text-cyan-500" />
        </button>
      </div>
    </form>
  );
}
