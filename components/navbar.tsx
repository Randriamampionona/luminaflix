"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowRight, Menu, Search, X, Zap, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import NavbarActions from "./navbar-actions";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false); // Controlled state for Sheet
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const MENUS = ["Home", "Movies", "TV Shows", "New & Popular"];

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleMobileSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchQuery.trim() || isSearching) return;

    setIsSearching(true);

    // 1. Navigate to the search results
    router.push(`/search/${encodeURIComponent(searchQuery.trim())}`);

    // 2. Small delay to ensure navigation starts before the menu unmounts
    setTimeout(() => {
      setIsOpen(false);
      setIsSearching(false);
      setSearchQuery(""); // Clear for next time
    }, 300);
  };

  return (
    <nav
      className={`fixed top-0 w-full z-100 transition-all duration-500 ${
        isScrolled
          ? "py-4 bg-black/80 backdrop-blur-xl border-b border-white/5"
          : "py-6 bg-transparent"
      }`}
    >
      <div className="max-w-450 mx-auto px-6 md:px-12 flex items-center justify-between">
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

          <div className="hidden xl:flex items-center gap-8">
            {MENUS.map((item) => (
              <Link
                key={item}
                href={
                  item === "Home"
                    ? "/"
                    : `/${item.toLowerCase().replace(" & ", " ").replace(" ", "-")}`
                }
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-cyan-500 transition-colors"
              >
                {item}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <NavbarActions />

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button className="xl:hidden p-3 bg-zinc-900/50 border border-white/10 rounded-xl text-white hover:bg-zinc-800 transition-all">
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>

            <SheetContent
              side="right"
              className="w-full sm:w-100 bg-black/95 border-zinc-800 backdrop-blur-2xl p-0 z-100"
            >
              <SheetClose asChild>
                <button className="absolute top-4 right-4 p-3 bg-zinc-900/50 border border-white/10 rounded-xl text-white hover:bg-zinc-800 transition-all outline-none">
                  <X className="w-5 h-5" />
                </button>
              </SheetClose>

              <div className="p-8 pt-24 h-full flex flex-col">
                <form
                  onSubmit={handleMobileSearch}
                  className="relative mb-12 group"
                >
                  <div
                    className={`absolute -inset-0.5 bg-linear-to-r from-cyan-500 to-blue-600 rounded-2xl blur transition duration-1000 ${searchQuery ? "opacity-40" : "opacity-10"}`}
                  ></div>

                  <div className="relative flex items-center bg-zinc-950 rounded-2xl border border-white/10 group-within:border-cyan-500/50 transition-all overflow-hidden">
                    <Search
                      className={`ml-4 w-5 h-5 transition-colors ${searchQuery ? "text-cyan-400" : "text-zinc-500"}`}
                    />

                    <input
                      name="mobileSearch"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Lumina..."
                      className="w-full bg-transparent border-none outline-none py-5 px-4 text-sm font-bold uppercase tracking-widest text-white placeholder:text-zinc-700"
                    />

                    <button
                      type="submit"
                      disabled={!searchQuery.trim() || isSearching}
                      className="mr-2 p-3 bg-white disabled:bg-zinc-800 disabled:text-zinc-600 hover:bg-cyan-500 text-black rounded-xl transition-all active:scale-95 group/btn"
                    >
                      {isSearching ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
                      )}
                    </button>
                  </div>
                </form>

                <SheetTitle className="text-3xl font-black uppercase italic tracking-tighter text-white mb-12">
                  Navigation<span className="text-cyan-500">.</span>
                </SheetTitle>

                <div className="flex flex-col gap-6">
                  {MENUS.map((item) => (
                    <SheetClose key={item} asChild>
                      <Link
                        href={
                          item === "Home"
                            ? "/"
                            : `/${item.toLowerCase().replace(" & ", " ").replace(" ", "-")}`
                        }
                        className="group flex items-center justify-between font-black uppercase italic tracking-tighter text-zinc-500 hover:text-white transition-all"
                      >
                        <span className="group-hover:translate-x-2 transition-transform duration-300">
                          {item}
                        </span>
                        <Zap className="w-6 h-6 text-cyan-500 opacity-0 group-hover:opacity-100 transition-all" />
                      </Link>
                    </SheetClose>
                  ))}
                </div>

                <div className="mt-auto pb-12 space-y-6">
                  <div className="h-px w-full bg-white/5" />
                  <div className="flex flex-col gap-4">
                    <button className="w-full py-4 text-xs font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-white transition-colors">
                      Sign In
                    </button>
                    <button className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-cyan-500 hover:text-white transition-all shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                      Join Lumina Now
                    </button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
