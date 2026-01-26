"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ArrowUpDown } from "lucide-react";
import { useState } from "react";

const sortOptions = [
  { label: "Most Recent", value: "primary_release_date.desc" },
  { label: "Most Viewed", value: "popularity.desc" },
  { label: "Release Date", value: "primary_release_date.asc" },
  { label: "Top Rated", value: "vote_average.desc" },
  { label: "Name A-Z", value: "title.asc" },
];

export default function SortDropdown() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  const currentSort = searchParams.get("sort") || "primary_release_date.desc";
  const currentLabel = sortOptions.find(
    (opt) => opt.value === currentSort,
  )?.label;

  const handleSort = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    params.set("page", "1"); // Reset to page 1 on new sort
    router.push(`/movies?${params.toString()}`);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-5 py-2.5 bg-zinc-900/50 border border-white/10 rounded-lg text-zinc-300 hover:text-white hover:border-cyan-500/50 transition-all group"
      >
        <span className="text-sm font-bold uppercase tracking-widest">
          {currentLabel}
        </span>
        <ArrowUpDown className="w-4 h-4 text-cyan-500 group-hover:rotate-180 transition-transform duration-300" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSort(option.value)}
                className={`w-full text-left px-5 py-3 text-sm font-bold transition-colors border-b border-white/5 last:border-0 ${
                  currentSort === option.value
                    ? "text-cyan-500 bg-cyan-500/5"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
