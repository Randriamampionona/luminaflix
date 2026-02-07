"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import CustomLink from "../custom-link";

interface Props {
  currentPage: number;
  totalPages: number;
}

export default function Pagination({ currentPage, totalPages }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const safeTotalPages = Math.min(totalPages, 500);

  const getPages = () => {
    const pages = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(safeTotalPages, start + 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const createPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-16">
      {/* PREVIOUS */}
      {currentPage > 1 && (
        <CustomLink
          href={createPageUrl(currentPage - 1)}
          className="p-3 rounded-xl bg-zinc-900 border border-white/5 hover:border-cyan-500/50 hover:bg-cyan-500 hover:text-black transition-all duration-300"
        >
          <ChevronLeft className="w-5 h-5" />
        </CustomLink>
      )}

      {/* PAGE NUMBERS (No Padding) */}
      {getPages().map((p) => (
        <CustomLink
          key={p}
          href={createPageUrl(p)}
          className={`w-12 h-12 flex items-center justify-center rounded-xl font-bold transition-all duration-300 ${
            p === currentPage
              ? "bg-cyan-500 text-black shadow-[0_0_30px_rgba(6,182,212,0.3)]"
              : "bg-zinc-900 text-zinc-500 hover:text-white border border-white/5"
          }`}
        >
          {p}
        </CustomLink>
      ))}

      {/* NEXT */}
      {currentPage < safeTotalPages && (
        <CustomLink
          href={createPageUrl(currentPage + 1)}
          className="p-3 rounded-xl bg-zinc-900 border border-white/5 hover:border-cyan-500/50 hover:bg-cyan-500 hover:text-black transition-all duration-300"
        >
          <ChevronRight className="w-5 h-5" />
        </CustomLink>
      )}
    </div>
  );
}
