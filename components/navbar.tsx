"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import NavbarActions from "./navbar-actions";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  const MENUS = ["Home", "Movies", "TV Shows", "New & Popular"];

  // Handle scroll effect for glassmorphism
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-100 transition-all duration-500 ${
        isScrolled
          ? "py-4 bg-black/80 backdrop-blur-xl border-b border-white/5"
          : "py-8 bg-transparent"
      }`}
    >
      <div className="max-w-450 mx-auto px-8 md:px-16 flex items-center justify-between">
        {/* Left: Logo & Menu */}
        <div className="flex items-center gap-12">
          <Link href="/" className="group flex items-center gap-2">
            <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform duration-300 shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              <span className="text-black font-black text-xl italic leading-none">
                L
              </span>
            </div>
            <span className="text-2xl font-black uppercase italic tracking-tighter text-white">
              Lumina<span className="text-cyan-500">Flix</span>
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-8">
            {MENUS.map((item) => (
              <Link
                key={item}
                href={
                  item === "Home"
                    ? "/"
                    : `/${item.toLowerCase().replace(" & ", " ").replace(" ", "-")}`
                }
                className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-cyan-500 transition-colors"
              >
                {item}
              </Link>
            ))}
          </div>
        </div>

        {/* Right: Search & Auth */}
        <NavbarActions />
      </div>
    </nav>
  );
}
