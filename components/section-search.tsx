"use client";

import { Search, Terminal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import SmartSearchToggle from "@/components/search/smart-search-toggle";
import VoiceSearchButton from "@/components/voice-search-button";
import { useSmartSearch } from "@/hooks/use-smart-search";

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
  const { searchHref } = useSmartSearch();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = query.trim();
    if (value) router.push(searchHref(basePath, value));
  };

  const onVoice = (text: string) => {
    setQuery(text);
    router.push(searchHref(basePath, text));
  };

  return (
    // z-30: the voice popover must sit above the poster grid below.
    <form onSubmit={handleSubmit} role="search" className="group relative z-30 w-full max-w-md">
      <div
        aria-hidden
        className="absolute -inset-1 rounded-2xl bg-cyan-500/20 opacity-0 blur-md transition-opacity duration-500 group-focus-within:opacity-100"
      />
      <div className="relative flex items-center rounded-2xl border border-line bg-elevated/50 py-2 pr-3 pl-4 backdrop-blur-xl transition-colors group-focus-within:border-cyan-500/50">
        <Terminal className="mr-3 h-4 w-4 text-brand" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full border-none bg-transparent text-[10px] font-black uppercase tracking-[0.2em] text-foreground outline-none placeholder:text-fg-faint"
        />
        <SmartSearchToggle compact className="ml-2" />
        <VoiceSearchButton onTranscript={onVoice} size="sm" className="ml-2" />
        <button type="submit" aria-label={submitLabel} className="ml-2 transition-transform hover:scale-110">
          <Search className="h-4 w-4 text-fg-muted group-focus-within:text-brand" />
        </button>
      </div>
    </form>
  );
}