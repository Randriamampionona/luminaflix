"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  currentPage: number;
  totalPages: number;
}

export default function Pagination({ currentPage, totalPages }: Props) {
  // TMDb limits pagination to 500 pages for the free API tier
  const safeTotalPages = Math.min(totalPages, 500);

  const getPages = () => {
    const pages = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(safeTotalPages, start + 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-16">
      {currentPage > 1 && (
        <Link
          href={`/movies?page=${currentPage - 1}`}
          className="p-3 rounded-lg bg-zinc-900 border border-white/5 hover:bg-cyan-500 hover:text-black transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
      )}

      {getPages().map((p) => (
        <Link
          key={p}
          href={`/movies?page=${p}`}
          className={`w-12 h-12 flex items-center justify-center rounded-lg font-bold transition-all ${
            p === currentPage
              ? "bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]"
              : "bg-zinc-900 text-zinc-400 hover:text-white border border-white/5"
          }`}
        >
          {p}
        </Link>
      ))}

      {currentPage < safeTotalPages && (
        <Link
          href={`/movies?page=${currentPage + 1}`}
          className="p-3 rounded-lg bg-zinc-900 border border-white/5 hover:bg-cyan-500 hover:text-black transition-all"
        >
          <ChevronRight className="w-5 h-5" />
        </Link>
      )}
    </div>
  );
}
