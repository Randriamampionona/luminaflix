"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import {
  ArrowRight,
  Menu,
  Search,
  X,
  Zap,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NavbarActions from "./navbar-actions";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import LanguageSelector from "./language-selector";
import CustomLink from "./custom-link";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const MENUS = [
    "Movies",
    "New & Popular",
    "K-Drama",
    "Library",
    "Genres",
    "Anime",
    "TV Shows",
    "Favorites",
  ];

  const visibleMenus = MENUS.slice(0, 3);
  const hiddenMenus = MENUS.slice(3);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (path: string) => pathname === path;

  const getHref = (item: string) =>
    `/${item.toLowerCase().replace(" & ", "-").replace(" ", "-")}`;

  const handleMobileSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchQuery.trim() || isSearching) return;
    setIsSearching(true);
    router.push(`/search/${encodeURIComponent(searchQuery.trim())}`);
    setTimeout(() => {
      setIsOpen(false);
      setIsSearching(false);
      setSearchQuery("");
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
      <div className="max-w-360 mx-auto px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <CustomLink href="/" className="group flex items-center gap-2">
            <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform duration-300 shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              <span className="text-black font-black text-xl italic leading-none">
                L
              </span>
            </div>
            <span className="text-2xl font-black uppercase italic tracking-tighter text-white">
              Lumina<span className="text-cyan-500">Flix</span>
            </span>
          </CustomLink>

          {/* Desktop Menu */}
          <div className="hidden xl:flex items-center gap-8">
            {visibleMenus.map((item) => {
              const href = getHref(item);
              const active = isActive(href);
              return (
                <CustomLink
                  key={item}
                  href={href}
                  className={`relative text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 hover:text-cyan-500 ${
                    active ? "text-cyan-500" : "text-zinc-500"
                  }`}
                >
                  {item}
                </CustomLink>
              );
            })}

            {hiddenMenus.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-cyan-500 outline-none transition-colors group">
                  More
                  <ChevronDown className="w-3 h-3 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-zinc-950/95 border border-white/10 backdrop-blur-2xl p-2 min-w-45 rounded-md z-100">
                  {hiddenMenus.map((item) => {
                    const href = getHref(item);
                    const active = isActive(href);
                    return (
                      <DropdownMenuItem key={item} asChild>
                        <CustomLink
                          href={href}
                          className={`flex items-center justify-between px-4 py-3 rounded-md text-[10px] font-black uppercase tracking-widest transition-all focus:bg-cyan-500 focus:text-black ${
                            active
                              ? "text-cyan-500 bg-white/5"
                              : "text-zinc-400"
                          }`}
                        >
                          {item}
                          {active && <Zap className="w-3 h-3 fill-current" />}
                        </CustomLink>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <NavbarActions />
          <div className="hidden xl:flex items-center justify-center">
            <LanguageSelector />
          </div>

          {/* Mobile */}
          <div className="xl:hidden flex items-center justify-center">
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button className="xl:hidden p-3 bg-zinc-900/50 border border-white/10 rounded-xl text-white hover:bg-zinc-800 transition-all">
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>

            <SheetContent
              side="right"
              className="w-full sm:w-100 bg-black/95 border-zinc-800 backdrop-blur-2xl p-0 z-100 flex flex-col"
            >
              <div className="flex items-center justify-between w-full p-6 shrink-0">
                <SheetClose asChild>
                  <button className="p-3 bg-zinc-900/50 border border-white/10 rounded-xl text-white outline-none">
                    <X className="w-5 h-5" />
                  </button>
                </SheetClose>
                <div className="flex xl:hidden items-center justify-center">
                  <LanguageSelector />
                </div>
              </div>

              <div className="p-8 flex-1 overflow-y-auto no-scrollbar flex flex-col">
                <form
                  onSubmit={handleMobileSearch}
                  className="relative mb-12 group shrink-0"
                >
                  <div
                    className={`absolute -inset-0.5 bg-linear-to-r from-cyan-500 to-blue-600 rounded-2xl blur transition duration-1000 ${
                      searchQuery ? "opacity-40" : "opacity-10"
                    }`}
                  />
                  <div className="relative flex items-center bg-zinc-950 rounded-2xl border border-white/10 transition-all overflow-hidden">
                    <Search
                      className={`ml-4 w-5 h-5 ${
                        searchQuery ? "text-cyan-400" : "text-zinc-500"
                      }`}
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Lumina..."
                      className="w-full bg-transparent border-none outline-none py-5 px-4 text-sm font-bold uppercase tracking-widest text-white placeholder:text-zinc-700"
                    />
                    <button
                      type="submit"
                      className="mr-2 p-3 bg-white text-black rounded-xl"
                    >
                      {isSearching ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ArrowRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </form>

                <SheetTitle className="text-3xl font-black uppercase italic tracking-tighter text-white mb-12">
                  Navigation<span className="text-cyan-500">.</span>
                </SheetTitle>

                <div className="flex flex-col gap-6 mb-12">
                  {MENUS.map((item) => {
                    const href = getHref(item);
                    const active = isActive(href);
                    return (
                      <SheetClose key={item} asChild>
                        <CustomLink
                          href={href}
                          className={`group flex items-center justify-between font-black uppercase italic tracking-tighter transition-all ${
                            active
                              ? "text-white text-2xl"
                              : "text-zinc-500 hover:text-white"
                          }`}
                        >
                          <span>{item}</span>
                          <Zap
                            className={`w-6 h-6 text-cyan-500 ${
                              active
                                ? "opacity-100 scale-125 shadow-cyan-500"
                                : "opacity-0 group-hover:opacity-100"
                            }`}
                          />
                        </CustomLink>
                      </SheetClose>
                    );
                  })}
                </div>

                {/* --- RESTORED FOOTER ACTIONS --- */}
                <div className="mt-auto pb-12 space-y-6 shrink-0">
                  <div className="h-px w-full bg-white/5" />
                  <SignedOut>
                    <div className="flex flex-col gap-4">
                      {/* Wrap Sign In Link */}
                      <SheetClose asChild>
                        <CustomLink
                          href="/sign-in"
                          className="w-full py-4 text-xs font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-white text-center"
                        >
                          Sign In
                        </CustomLink>
                      </SheetClose>

                      {/* Wrap Join Lumina Link */}
                      <SheetClose asChild>
                        <CustomLink
                          href="/sign-up"
                          className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-cyan-500 hover:text-white transition-all text-center"
                        >
                          Join Lumina Now
                        </CustomLink>
                      </SheetClose>
                    </div>
                  </SignedOut>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
