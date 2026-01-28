"use client";

import { Search, ArrowRight, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import UserTerminal from "./user-terminal";
import SearchHub from "./search-hub";

export default function NavbarActions() {
  const [isFocused, setIsFocused] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  // 1. Create a reference to the input element
  const inputRef = useRef<HTMLInputElement>(null);

  // 2. Keyboard Shortcut Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault(); // Stop browser search
        inputRef.current?.focus();
        setIsFocused(true);
      }

      // Bonus: Press 'Escape' to close search
      if (e.key === "Escape") {
        inputRef.current?.blur();
        setIsFocused(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    router.push(`/search/${encodeURIComponent(query.trim())}`);
    setIsFocused(false);
    inputRef.current?.blur();
  };

  return (
    <div className="hidden lg:flex items-center gap-3 md:gap-6">
      {/* THE NEW SEARCH TRIGGER */}
      <SearchHub />

      {/* Rest of your Auth buttons ... */}
      <div className="h-6 w-px bg-white/10 hidden sm:block" />
      <div className="flex items-center gap-2">
        <SignedOut>
          <Link href="/sign-in">
            <button className="hidden lg:block px-4 py-2.5 text-xs font-black uppercase cursor-pointer tracking-widest text-zinc-400 hover:text-white transition-colors">
              Sign In
            </button>
          </Link>
          <Link href="/sign-up">
            <button className="group relative flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-white cursor-pointer overflow-hidden rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg">
              <span className="relative z-10 text-black font-black uppercase italic tracking-tighter text-[10px] md:text-sm whitespace-nowrap">
                Join Lumina
              </span>
              <ArrowRight className="relative z-10 w-3 h-3 md:w-4 md:h-4 text-black" />
            </button>
          </Link>
        </SignedOut>
        <SignedIn>
          <UserTerminal />
        </SignedIn>
      </div>
    </div>
  );
}
