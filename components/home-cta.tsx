"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import CustomLink from "./custom-link";

export default function HomeCTA() {
  return (
    <section className="px-8 md:px-16 py-20 flex flex-col items-center text-center">
      {/* Decorative Line */}
      <div className="w-24 h-1 bg-cyan-500 mb-8 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.5)]" />

      <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter text-white mb-6">
        Ready to dive in<span className="text-cyan-500 not-italic pl-4">?</span>
      </h2>

      <p className="text-zinc-400 text-lg max-w-2xl mb-10 leading-relaxed">
        Browse our entire collection of blockbuster movies and award-winning
        series. Filter by genre, year, or rating to find exactly what
        you&apos;re looking for.
      </p>

      <CustomLink href="/library">
        <button className="group flex items-center gap-3 bg-cyan-500 text-black px-12 py-4 rounded-full font-black uppercase text-sm hover:bg-white transition-all duration-300 transform hover:scale-105 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
          Explore the Library
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </CustomLink>
    </section>
  );
}
