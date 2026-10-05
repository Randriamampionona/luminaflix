"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  Clock,
  CornerDownLeft,
  Drama,
  Eye,
  Fingerprint,
  Ghost,
  Landmark,
  LayoutGrid,
  Mountain,
  Music,
  Palette,
  Rocket,
  Search,
  Sparkles,
  Users,
  WandSparkles,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import SmartSearchToggle from "@/components/search/smart-search-toggle";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import VoiceSearchButton from "@/components/voice-search-button";
import { useSmartSearch } from "@/hooks/use-smart-search";
import { SEARCH_GENRES } from "@/lib/filters";
import { cn } from "@/lib/utils";

/** Icon + accent colour per genre tile. */
const GENRE_STYLE: Record<string, { icon: LucideIcon; color: string }> = {
  "28": { icon: Zap, color: "text-amber-500 bg-amber-500/10" },
  "16": { icon: Palette, color: "text-pink-500 bg-pink-500/10" },
  "99": { icon: Camera, color: "text-emerald-500 bg-emerald-500/10" },
  "18": { icon: Drama, color: "text-violet-500 bg-violet-500/10" },
  "27": { icon: Ghost, color: "text-red-500 bg-red-500/10" },
  "10751": { icon: Users, color: "text-sky-500 bg-sky-500/10" },
  "14": { icon: WandSparkles, color: "text-fuchsia-500 bg-fuchsia-500/10" },
  "36": { icon: Landmark, color: "text-orange-500 bg-orange-500/10" },
  "10402": { icon: Music, color: "text-rose-500 bg-rose-500/10" },
  "878": { icon: Rocket, color: "text-cyan-500 bg-cyan-500/10" },
  "53": { icon: Eye, color: "text-indigo-500 bg-indigo-500/10" },
  "37": { icon: Mountain, color: "text-yellow-600 bg-yellow-600/10" },
  "9648": { icon: Fingerprint, color: "text-teal-500 bg-teal-500/10" },
};

// ---------------------------------------------------------------- recents --

const RECENT_KEY = "luminaflix:recent-searches";
const RECENT_EVENT = "luminaflix:recent-searches";
const MAX_RECENT = 6;
const EMPTY: string[] = [];
let recentCache: { raw: string | null; list: string[] } = { raw: null, list: EMPTY };

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (raw !== recentCache.raw) {
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      recentCache = { raw, list: Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : EMPTY };
    }
    return recentCache.list;
  } catch {
    return EMPTY;
  }
}

function writeRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // storage blocked: recents just aren't kept
  }
  window.dispatchEvent(new Event(RECENT_EVENT));
}

const subscribeRecent = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(RECENT_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(RECENT_EVENT, onChange);
  };
};

function useRecentSearches() {
  const recent = useSyncExternalStore(subscribeRecent, readRecent, () => EMPTY);
  const add = useCallback((query: string) => {
    const next = [query, ...readRecent().filter((q) => q.toLowerCase() !== query.toLowerCase())].slice(0, MAX_RECENT);
    writeRecent(next);
  }, []);
  const clear = useCallback(() => writeRecent([]), []);
  return { recent, add, clear };
}

function SectionTitle({
  icon: Icon,
  children,
  action,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-fg-subtle">
        <Icon className="h-3.5 w-3.5 text-brand" aria-hidden />
        {children}
      </p>
      {action}
    </div>
  );
}

/**
 * Global search (Ctrl/Cmd + K): free text or a described plot (AI search),
 * voice input, recent searches, example prompts and genre shortcuts.
 */
export default function SearchHub() {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { enabled: aiEnabled, searchHref } = useSmartSearch();
  const { recent, add, clear } = useRecentSearches();

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

  const navigate = (path: string) => {
    setOpen(false);
    setQuery("");
    router.push(path);
  };

  const runSearch = (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    add(clean);
    navigate(searchHref("/search", clean));
  };

  const examples = [t("search.hub.example1"), t("search.hub.example2"), t("search.hub.example3")];

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
        <DialogContent
          showCloseButton={false}
          className="z-100 flex max-h-[88vh] w-[calc(100%-1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-3xl border-line-strong bg-surface p-0 shadow-[0_0_120px_-20px_rgba(6,182,212,0.45)] outline-none sm:max-w-3xl"
        >
          <DialogTitle className="sr-only">{t("search.dialogTitle")}</DialogTitle>
          <DialogDescription className="sr-only">{t("search.smart.hint")}</DialogDescription>

          {/* Ambient glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-28 left-1/2 h-56 w-2/3 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl"
          />

          {/* Search bar — z-20 so the voice popover sits above everything below */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runSearch(query);
            }}
            role="search"
            className="relative z-20 shrink-0 border-b border-line px-5 pt-5 pb-4 sm:px-7 sm:pt-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand">{t("search.dialogTitle")}</p>
              <DialogClose
                aria-label={t("common.close")}
                className="cursor-pointer rounded-full border border-line-strong bg-tint p-1.5 text-fg-subtle transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              >
                <X className="h-4 w-4" />
              </DialogClose>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-line-strong bg-background/70 py-2 pr-2 pl-4 transition-all focus-within:border-cyan-500/60 focus-within:ring-4 focus-within:ring-cyan-500/10">
              <Search aria-hidden className="h-5 w-5 shrink-0 text-fg-faint" />
              <input
                autoFocus
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={aiEnabled ? t("search.hub.placeholderAi") : t("search.placeholder")}
                aria-label={t("search.placeholder")}
                className="min-w-0 flex-1 bg-transparent py-2.5 text-base font-semibold text-foreground outline-none placeholder:font-medium placeholder:text-fg-faint sm:text-lg [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label={t("search.hub.clear")}
                  className="cursor-pointer rounded-full p-1.5 text-fg-faint transition-colors hover:bg-tint hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <SmartSearchToggle compact />
              <VoiceSearchButton onTranscript={runSearch} size="md" />
              <button
                type="submit"
                disabled={!query.trim()}
                className="hidden h-10 cursor-pointer items-center gap-2 rounded-xl bg-cyan-500 px-4 text-[10px] font-black uppercase tracking-widest text-black transition-all hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40 sm:flex"
              >
                {t("search.submit")}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>

            <p className="mt-3 flex items-center gap-2 text-[11px] text-fg-subtle">
              <Sparkles
                className={cn("h-3.5 w-3.5 shrink-0", aiEnabled ? "text-brand" : "text-fg-faint")}
                aria-hidden
              />
              {aiEnabled ? t("search.smart.on") : t("search.smart.off")}
            </p>
          </form>

          {/* Body */}
          <div className="relative z-10 min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-6 sm:px-7">
            {recent.length > 0 && (
              <section>
                <SectionTitle
                  icon={Clock}
                  action={
                    <button
                      type="button"
                      onClick={clear}
                      className="cursor-pointer text-[10px] font-bold uppercase tracking-widest text-fg-faint transition-colors hover:text-foreground"
                    >
                      {t("search.hub.clearRecent")}
                    </button>
                  }
                >
                  {t("search.hub.recent")}
                </SectionTitle>
                <div className="flex flex-wrap gap-2">
                  {recent.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => runSearch(item)}
                      className="group flex max-w-full cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-tint px-3.5 py-2 text-xs font-semibold text-fg-soft transition-colors hover:border-cyan-500/50 hover:text-foreground"
                    >
                      <Clock className="h-3 w-3 shrink-0 text-fg-faint" aria-hidden />
                      <span className="truncate">{item}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {aiEnabled && (
              <section>
                <SectionTitle icon={Sparkles}>{t("search.hub.tryAi")}</SectionTitle>
                <div className="grid gap-2 sm:grid-cols-3">
                  {examples.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => runSearch(example)}
                      className="group flex cursor-pointer items-start gap-2 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-3.5 text-left text-xs leading-snug font-medium text-fg-soft transition-all hover:-translate-y-0.5 hover:border-cyan-500/50 hover:text-foreground"
                    >
                      <span className="flex-1">“{example}”</span>
                      <ArrowUpRight
                        className="h-3.5 w-3.5 shrink-0 text-brand opacity-50 transition-opacity group-hover:opacity-100"
                        aria-hidden
                      />
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section>
              <SectionTitle icon={LayoutGrid}>{t("search.categories")}</SectionTitle>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                {SEARCH_GENRES.map((id) => {
                  const style = GENRE_STYLE[id] ?? { icon: LayoutGrid, color: "text-brand bg-cyan-500/10" };
                  const Icon = style.icon;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => navigate(`/genres/${id}`)}
                      className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-line bg-tint-soft p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-500/40 hover:bg-tint hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                    >
                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110",
                          style.color,
                        )}
                      >
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 text-sm leading-tight font-bold break-words text-foreground">
                        {t(`genres.g${id}` as "genres.g28")}
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => navigate("/genres")}
                  className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-line-strong p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-inverse text-inverse-fg">
                    <LayoutGrid className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="flex-1 text-sm font-bold text-foreground">{t("search.seeAllGenres")}</span>
                  <ArrowRight
                    className="h-4 w-4 text-fg-faint transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </button>
              </div>
            </section>
          </div>

          {/* Footer: keyboard hints */}
          <div className="relative z-10 hidden shrink-0 items-center justify-end gap-5 border-t border-line bg-background/40 px-7 py-3.5 text-[10px] font-bold uppercase tracking-wider text-fg-faint sm:flex">
            <span className="flex items-center gap-1.5">
              <kbd className="flex items-center rounded border border-line-strong bg-elevated px-1.5 py-0.5 text-fg-subtle">
                <CornerDownLeft className="h-3 w-3" aria-hidden />
              </kbd>
              {t("search.hub.enterHint")}
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-line-strong bg-elevated px-1.5 py-0.5 text-fg-subtle">ESC</kbd>
              {t("search.escHint")}
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-line-strong bg-elevated px-1.5 py-0.5 text-fg-subtle">
                {t("search.shortcut")}
              </kbd>
              {t("search.hub.toggleHint")}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}