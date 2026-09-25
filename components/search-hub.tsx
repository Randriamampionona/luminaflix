"use client";

import { ArrowRight, Film, Search, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SEARCH_GENRES } from "@/lib/filters";

export default function SearchHub() {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // PERF: navigation used to be wrapped in an artificial 500 ms setTimeout,
  // which read as lag. We now navigate immediately and close the dialog.
  const navigate = (path: string) => {
    setOpen(false);
    setQuery("");
    router.push(path);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const value = query.trim();
    if (value) navigate(`/search/${encodeURIComponent(value)}`);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-keyshortcuts="Control+K Meta+K"
        className="flex cursor-pointer items-center gap-4 rounded-2xl border border-cyan-500/50 bg-zinc-900 px-4 py-3 transition-colors hover:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        <Search className="h-4 w-4 text-cyan-400" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{t("search.trigger")}</span>
        <kbd className="hidden rounded border border-white/10 bg-black px-1.5 py-0.5 text-[9px] font-bold text-zinc-500 xl:inline">
          {t("search.shortcut")}
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="z-100 max-w-2xl overflow-hidden rounded-md border-white/10 bg-black/80 p-0 shadow-[0_0_100px_rgba(6,182,212,0.2)] outline-none backdrop-blur-3xl sm:max-w-2xl">
          <DialogTitle className="sr-only">{t("search.dialogTitle")}</DialogTitle>
          <DialogDescription className="sr-only">{t("search.categories")}</DialogDescription>

          <form onSubmit={handleSearch} role="search" className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-8 top-1/2 h-6 w-6 -translate-y-1/2 text-zinc-700" />
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search.placeholder")}
              aria-label={t("search.placeholder")}
              className="w-full border-none bg-transparent py-11 pl-20 pr-14 text-2xl font-black uppercase italic tracking-tighter text-white outline-none placeholder:text-zinc-700 sm:text-3xl"
            />
            {query.trim().length > 0 && (
              <p className="pointer-events-none absolute left-20 right-8 top-[calc(50%+1.75rem)] flex items-center gap-2 text-cyan-500">
                <Zap className="h-3 w-3 fill-current" />
                <span className="truncate text-[10px] font-black uppercase tracking-widest">
                  {t("search.runSearch", { query: query.trim() })}
                </span>
              </p>
            )}
          </form>

          <div className="px-8 pb-8">
            <p className="mb-4 flex items-center gap-2">
              <Film className="h-3 w-3 text-cyan-500" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500">{t("search.categories")}</span>
            </p>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SEARCH_GENRES.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => navigate(`/genres/${id}`)}
                  className="group/item relative flex overflow-hidden rounded-xl border border-white/5 bg-white/5 p-3 text-left transition-colors duration-300 hover:border-white hover:bg-white focus-visible:border-white focus-visible:bg-white"
                >
                  <span className="relative z-10 text-[9px] font-black uppercase tracking-widest text-zinc-500 transition-colors group-hover/item:text-black group-focus-visible/item:text-black">
                    {t(`genres.g${id}` as "genres.g28")}
                  </span>
                  <ArrowRight className="absolute bottom-1 right-1 h-3 w-3 text-black opacity-0 transition-opacity group-hover/item:opacity-100" />
                </button>
              ))}
              <Link
                href="/genres"
                onClick={() => setOpen(false)}
                className="group/item relative flex overflow-hidden rounded-xl border border-white/5 bg-white/5 p-3 transition-colors duration-300 hover:border-white hover:bg-white"
              >
                <span className="relative z-10 text-[9px] font-black uppercase tracking-widest text-zinc-500 transition-colors group-hover/item:text-black">
                  {t("search.seeAllGenres")}
                </span>
                <ArrowRight className="absolute bottom-1 right-1 h-3 w-3 text-black opacity-0 transition-opacity group-hover/item:opacity-100" />
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-white/5 bg-zinc-950/50 px-8 py-5 text-[9px] font-bold uppercase text-zinc-600">
            <kbd className="rounded border border-white/5 bg-zinc-900 px-1.5 py-0.5 text-zinc-500">ESC</kbd>
            <span>{t("search.escHint")}</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
