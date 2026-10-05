"use client";

import { ArrowRight, Film, Search, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import SmartSearchToggle from "@/components/search/smart-search-toggle";
import VoiceSearchButton from "@/components/voice-search-button";
import { useSmartSearch } from "@/hooks/use-smart-search";
import { SEARCH_GENRES } from "@/lib/filters";

export default function SearchHub() {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { searchHref } = useSmartSearch();

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
    if (value) navigate(searchHref("/search", value));
  };

  // Voice: fill the input, then search right away.
  const onVoice = (text: string) => {
    setQuery(text);
    navigate(searchHref("/search", text));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-keyshortcuts="Control+K Meta+K"
        className="flex cursor-pointer items-center gap-4 rounded-2xl border border-cyan-500/50 bg-elevated px-4 py-3 transition-colors hover:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        <Search className="h-4 w-4 text-brand-bright" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-fg-muted">{t("search.trigger")}</span>
        <kbd className="hidden rounded border border-line-strong bg-background px-1.5 py-0.5 text-[9px] font-bold text-fg-subtle xl:inline">
          {t("search.shortcut")}
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="z-100 max-w-2xl overflow-hidden rounded-md border-line-strong bg-background/95 p-0 shadow-[0_0_100px_rgba(6,182,212,0.2)] outline-none backdrop-blur-3xl sm:max-w-2xl">
          <DialogTitle className="sr-only">{t("search.dialogTitle")}</DialogTitle>
          <DialogDescription className="sr-only">{t("search.categories")}</DialogDescription>

          <form onSubmit={handleSearch} role="search" className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-8 top-1/2 h-6 w-6 -translate-y-1/2 text-fg-ghost"
            />
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search.placeholder")}
              aria-label={t("search.placeholder")}
              className="w-full border-none bg-transparent py-11 pl-20 pr-32 text-2xl font-black uppercase italic tracking-tighter text-foreground outline-none placeholder:text-fg-ghost sm:text-3xl"
            />
            {/* AI switch + microphone */}
            <div className="absolute top-1/2 right-6 flex -translate-y-1/2 items-center gap-2">
              <SmartSearchToggle compact />
              <VoiceSearchButton onTranscript={onVoice} size="lg" />
            </div>
            {query.trim().length > 0 && (
              <p className="pointer-events-none absolute left-20 right-8 top-[calc(50%+1.75rem)] flex items-center gap-2 text-brand">
                <Zap className="h-3 w-3 fill-current" />
                <span className="truncate text-[10px] font-black uppercase tracking-widest">
                  {t("search.runSearch", { query: query.trim() })}
                </span>
              </p>
            )}
          </form>

          <div className="px-8 pb-8">
            <p className="mb-6 text-[11px] text-fg-subtle">{t("search.smart.hint")}</p>
            <p className="mb-4 flex items-center gap-2">
              <Film className="h-3 w-3 text-brand" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-fg-subtle">
                {t("search.categories")}
              </span>
            </p>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SEARCH_GENRES.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => navigate(`/genres/${id}`)}
                  className="group/item relative flex overflow-hidden rounded-xl border border-line bg-tint p-3 text-left transition-colors duration-300 hover:border-inverse hover:bg-inverse focus-visible:border-inverse focus-visible:bg-inverse"
                >
                  <span className="relative z-10 text-[9px] font-black uppercase tracking-widest text-fg-subtle transition-colors group-hover/item:text-inverse-fg group-focus-visible/item:text-inverse-fg">
                    {t(`genres.g${id}` as "genres.g28")}
                  </span>
                  <ArrowRight className="absolute bottom-1 right-1 h-3 w-3 text-inverse-fg opacity-0 transition-opacity group-hover/item:opacity-100" />
                </button>
              ))}
              <Link
                href="/genres"
                onClick={() => setOpen(false)}
                className="group/item relative flex overflow-hidden rounded-xl border border-line bg-tint p-3 transition-colors duration-300 hover:border-inverse hover:bg-inverse"
              >
                <span className="relative z-10 text-[9px] font-black uppercase tracking-widest text-fg-subtle transition-colors group-hover/item:text-inverse-fg">
                  {t("search.seeAllGenres")}
                </span>
                <ArrowRight className="absolute bottom-1 right-1 h-3 w-3 text-inverse-fg opacity-0 transition-opacity group-hover/item:opacity-100" />
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-line bg-surface/50 px-8 py-5 text-[9px] font-bold uppercase text-fg-faint">
            <kbd className="rounded border border-line bg-elevated px-1.5 py-0.5 text-fg-subtle">ESC</kbd>
            <span>{t("search.escHint")}</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}