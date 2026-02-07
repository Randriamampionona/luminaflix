"use client";

import { useEffect, useState } from "react"; // Added useState
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

const Flag = ({ code }: { code: string }) => (
  <img
    src={`https://flagcdn.com/16x12/${code}.png`}
    alt={code}
    width="16"
    height="12"
    className="rounded-[2px] object-cover"
  />
);

export default function LanguageSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 1. Initialize state from URL or fallback
  const [currentLang, setCurrentLang] = useState("en-US");

  // 2. Sync UI state with URL and LocalStorage
  useEffect(() => {
    const savedLang = localStorage.getItem("display_lang");
    const urlParam = searchParams.get("display_lang");

    // Priority: URL Param > LocalStorage > Default 'en'
    const activeLang = urlParam || savedLang || "en-US";
    setCurrentLang(activeLang);

    // Silent URL sync if param is missing but storage exists
    if (savedLang && urlParam !== savedLang) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("display_lang", savedLang);
      const newUrl = `${pathname}?${params.toString()}`;
      window.history.replaceState(
        { ...window.history.state, as: newUrl, url: newUrl },
        "",
        newUrl,
      );
    }
  }, [pathname, searchParams]);

  const handleLanguageChange = (value: string) => {
    // 1. Update LocalStorage
    localStorage.setItem("display_lang", value);

    // 2. Update Local State immediately for the UI
    setCurrentLang(value);

    // 3. Dispatch event for CustomLink to react
    window.dispatchEvent(new Event("langChange"));

    // 4. Update current URL parameters
    const params = new URLSearchParams(searchParams.toString());
    params.set("display_lang", value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-3 px-4 bg-white/5 border border-white/10 rounded-xl h-11 text-[10px] text-white font-black uppercase tracking-widest hover:border-cyan-500/30 transition-all outline-none focus:ring-0 cursor-pointer">
        <Flag code={currentLang === "en-US" ? "us" : "fr"} />
        <span>{currentLang === "en-US" ? "EN" : "FR"}</span>
        <ChevronDown className="w-3 h-3 text-zinc-500" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="bg-[#050505] border-white/10 rounded-2xl backdrop-blur-3xl p-1 shadow-2xl min-w-30 z-100"
      >
        <DropdownMenuItem
          onClick={() => handleLanguageChange("fr-FR")}
          className="flex items-center gap-3 rounded-xl text-[10px] font-black uppercase tracking-widest focus:bg-white text-white focus:text-black transition-all py-3 cursor-pointer mb-1 outline-none"
        >
          <Flag code="fr" />
          <span>FR</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleLanguageChange("en-US")}
          className="flex items-center gap-3 rounded-xl text-[10px] font-black uppercase tracking-widest focus:bg-white text-white focus:text-black transition-all py-3 cursor-pointer outline-none"
        >
          <Flag code="us" />
          <span>EN</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
