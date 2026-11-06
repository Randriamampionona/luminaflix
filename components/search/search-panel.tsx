"use client";

import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  Clock,
  Drama,
  Eye,
  Fingerprint,
  Flame,
  Ghost,
  Landmark,
  Layers,
  LayoutGrid,
  Loader2,
  Mountain,
  Music,
  Palette,
  Rocket,
  Search,
  Sparkles,
  Star,
  Users,
  WandSparkles,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getSearchSuggestions, getTrendingSearches, type SearchSuggestion } from "@/action/search-suggestions.action";
import SmartSearchToggle from "@/components/search/smart-search-toggle";
import VoiceSearchButton from "@/components/voice-search-button";
import { useSmartSearch } from "@/hooks/use-smart-search";
import { COLLECTIONS, loc } from "@/lib/collections";
import { SEARCH_GENRES } from "@/lib/filters";
import { getWatchHref } from "@/lib/media";
import { SEARCH_SCOPES, searchResultsHref, type SearchScopeKey } from "@/lib/search/scopes";
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
const MAX_RECENT = 8;
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
  const remove = useCallback((query: string) => writeRecent(readRecent().filter((q) => q !== query)), []);
  return { recent, add, clear, remove };
}

/** Collections shown as shortcuts: the first of each section. */
const COLLECTION_SHORTCUTS = ["best", "sagas", "studios", "world", "moods"]
  .flatMap((group) => COLLECTIONS.filter((c) => c.group === group).slice(0, group === "sagas" ? 3 : 1))
  .slice(0, 7);

// Instant results: one request per query and visit, trending once per visit.
const suggestionCache = new Map<string, Promise<SearchSuggestion[]>>();
let trendingPromise: Promise<SearchSuggestion[]> | null = null;
const suggestionsFor = (query: string) => {
  const key = query.toLowerCase();
  let pending = suggestionCache.get(key);
  if (!pending) {
    pending = getSearchSuggestions(query).catch(() => []);
    suggestionCache.set(key, pending);
  }
  return pending;
};

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

const KIND_LABEL = { movie: "movie", tv: "tv", kdrama: "kdrama", anime: "anime" } as const;

function SuggestionRow({
  item,
  active,
  onPick,
  kindLabel,
}: {
  item: SearchSuggestion;
  active: boolean;
  onPick: () => void;
  kindLabel: string;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onPick}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-2xl p-2 text-left transition-colors",
        active ? "bg-cyan-500/10 ring-1 ring-cyan-500/40" : "hover:bg-tint",
      )}
    >
      <span className="relative h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-elevated">
        {item.poster && (
          <Image
            src={`https://image.tmdb.org/t/p/w154${item.poster}`}
            alt=""
            fill
            sizes="44px"
            className="object-cover"
          />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-foreground">{item.title}</span>
        <span className="mt-1 flex items-center gap-2 text-[11px] font-semibold text-fg-subtle">
          <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-brand">
            {kindLabel}
          </span>
          {item.year && <span>{item.year}</span>}
          {item.rating > 0 && (
            <span className="flex items-center gap-0.5 text-amber-500">
              <Star className="h-3 w-3 fill-current" aria-hidden />
              {item.rating.toFixed(1)}
            </span>
          )}
        </span>
      </span>
      <ArrowUpRight className={cn("h-4 w-4 shrink-0", active ? "text-brand" : "text-fg-faint")} aria-hidden />
    </button>
  );
}

/**
 * The search experience, shared by the Ctrl/Cmd+K dialog (desktop) and the
 * /search page (phones): free text or a described plot (AI search), voice,
 * section filter, instant results with posters (↑ ↓ Enter), recent searches,
 * trending titles, example prompts, collections and genres.
 */
export default function SearchPanel({
  variant,
  onNavigate,
  headerAction,
  initialQuery = "",
  initialScope = "all",
}: {
  variant: "dialog" | "page";
  onNavigate: (path: string) => void;
  /** Close button of the dialog. */
  headerAction?: React.ReactNode;
  initialQuery?: string;
  initialScope?: SearchScopeKey;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [query, setQuery] = useState(initialQuery);
  const [scope, setScope] = useState<SearchScopeKey>(initialScope);
  const { enabled: aiEnabled } = useSmartSearch();
  const { recent, add, clear, remove } = useRecentSearches();
  const [suggestions, setSuggestions] = useState<{ query: string; items: SearchSuggestion[] } | null>(null);
  const [active, setActive] = useState(-1);
  const [trending, setTrending] = useState<SearchSuggestion[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const typed = query.trim();
  const showInstant = typed.length >= 2;
  const instant = suggestions?.query === typed ? suggestions.items : null;

  // Instant results, 250 ms after the last key.
  useEffect(() => {
    if (typed.length < 2) return;
    let alive = true;
    const timer = setTimeout(() => {
      void suggestionsFor(typed).then((items) => {
        if (alive) {
          setSuggestions({ query: typed, items });
          setActive(-1);
        }
      });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [typed]);

  useEffect(() => {
    let alive = true;
    trendingPromise ??= getTrendingSearches().catch(() => []);
    void trendingPromise.then((items) => alive && setTrending(items));
    return () => {
      alive = false;
    };
  }, []);

  const runSearch = (value: string, inScope: SearchScopeKey = scope) => {
    const clean = value.trim();
    if (!clean) return;
    add(clean);
    onNavigate(searchResultsHref(clean, { ai: aiEnabled, scope: inScope }));
  };

  const openTitle = (item: SearchSuggestion) => {
    if (typed) add(typed);
    onNavigate(getWatchHref(item.id, item.kind, item.title));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!instant?.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % instant.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? instant.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0 && instant[active]) {
      e.preventDefault();
      openTitle(instant[active]);
    }
  };

  const examples = [t("search.hub.example1"), t("search.hub.example2"), t("search.hub.example3")];
  const kindLabel = (kind: SearchSuggestion["kind"]) => t(`search.kinds.${KIND_LABEL[kind]}`);
  const isPage = variant === "page";

  return (
    <div className={cn("relative flex min-h-0 flex-col", !isPage && "max-h-[88vh]")}>
      {/* Search bar — z-20 so the voice popover sits above everything below */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (active >= 0 && instant?.[active]) openTitle(instant[active]);
          else runSearch(query);
        }}
        role="search"
        className={cn(
          "relative z-20 shrink-0",
          isPage
            ? "sticky top-16 -mx-4 bg-background/95 px-4 pt-2 pb-4 backdrop-blur-xl sm:top-20 sm:mx-0 sm:rounded-3xl sm:border sm:border-line sm:px-6 sm:pt-5"
            : "border-b border-line px-5 pt-5 pb-4 sm:px-7 sm:pt-6",
        )}
      >
        {!isPage && (
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand">{t("search.dialogTitle")}</p>
            {headerAction}
          </div>
        )}

        <div className="flex items-center gap-2 rounded-2xl border border-line-strong bg-background/70 py-2 pr-2 pl-4 transition-all focus-within:border-cyan-500/60 focus-within:ring-4 focus-within:ring-cyan-500/10">
          <Search aria-hidden className="h-5 w-5 shrink-0 text-fg-faint" />
          <input
            ref={inputRef}
            autoFocus
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              // Typing again cancels a ↑ ↓ selection: Enter searches the typed text.
              setActive(-1);
            }}
            onKeyDown={onKeyDown}
            placeholder={aiEnabled ? t("search.hub.placeholderAi") : t("search.placeholder")}
            aria-label={t("search.placeholder")}
            aria-autocomplete="list"
            aria-controls="search-instant"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-base font-semibold text-foreground outline-none placeholder:font-medium placeholder:text-fg-faint sm:text-lg [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label={t("search.hub.clear")}
              className="cursor-pointer rounded-full p-1.5 text-fg-faint transition-colors hover:bg-tint hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <SmartSearchToggle compact />
          <VoiceSearchButton onTranscript={(text) => runSearch(text)} size="md" />
          <button
            type="submit"
            disabled={!typed}
            aria-label={t("search.submit")}
            className="flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-cyan-500 px-3 text-[10px] font-black uppercase tracking-widest text-black transition-all hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
          >
            <span className="hidden sm:inline">{t("search.submit")}</span>
            <ArrowRight className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden />
          </button>
        </div>

        {/* Section filter */}
        <div
          className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 scrollbar-hide"
          role="radiogroup"
          aria-label={t("search.scopes.label")}
        >
          {SEARCH_SCOPES.map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={scope === key}
              onClick={() => setScope(key)}
              className={cn(
                "shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors",
                scope === key
                  ? "border-cyan-500 bg-cyan-500 text-black"
                  : "border-line-strong bg-tint text-fg-muted hover:border-cyan-500/50 hover:text-foreground",
              )}
            >
              {t(`search.scopes.${key}`)}
            </button>
          ))}
        </div>

        <p className="mt-3 flex items-center gap-2 text-[11px] text-fg-subtle">
          <Sparkles className={cn("h-3.5 w-3.5 shrink-0", aiEnabled ? "text-brand" : "text-fg-faint")} aria-hidden />
          {aiEnabled ? t("search.smart.on") : t("search.smart.off")}
        </p>
      </form>

      {/* Body */}
      <div
        className={cn("relative z-10 space-y-7", isPage ? "pt-6" : "min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7")}
      >
        {showInstant ? (
          <section>
            <SectionTitle icon={Zap}>{t("search.hub.instant")}</SectionTitle>
            {instant === null ? (
              <p className="flex items-center gap-2 py-6 text-sm text-fg-subtle">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {t("search.hub.searching")}
              </p>
            ) : (
              <div id="search-instant" role="listbox" aria-label={t("search.hub.instant")} className="space-y-1">
                {instant.length === 0 && <p className="py-4 text-sm text-fg-subtle">{t("search.hub.noInstant")}</p>}
                {instant.map((item, index) => (
                  <SuggestionRow
                    key={`${item.kind}-${item.id}`}
                    item={item}
                    active={index === active}
                    onPick={() => openTitle(item)}
                    kindLabel={kindLabel(item.kind)}
                  />
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => runSearch(query)}
              className="mt-3 flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 px-4 py-3 text-left text-sm font-bold text-foreground transition-colors hover:bg-cyan-500/10"
            >
              <span className="min-w-0 truncate">
                {t("search.hub.seeAll", { query: typed })}
                {scope !== "all" && <span className="text-fg-subtle"> · {t(`search.scopes.${scope}`)}</span>}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-brand" aria-hidden />
            </button>
          </section>
        ) : (
          <>
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
                    <span
                      key={item}
                      className="flex max-w-full items-center rounded-full border border-line-strong bg-tint text-xs font-semibold text-fg-soft transition-colors hover:border-cyan-500/50"
                    >
                      <button
                        type="button"
                        onClick={() => runSearch(item)}
                        className="flex min-w-0 cursor-pointer items-center gap-2 py-2 pl-3.5 hover:text-foreground"
                      >
                        <Clock className="h-3 w-3 shrink-0 text-fg-faint" aria-hidden />
                        <span className="truncate">{item}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(item)}
                        aria-label={t("search.hub.removeRecent", { query: item })}
                        className="ml-1 cursor-pointer rounded-full p-2 text-fg-faint hover:text-foreground"
                      >
                        <X className="h-3 w-3" aria-hidden />
                      </button>
                    </span>
                  ))}
                </div>
              </section>
            )}

            {trending.length > 0 && (
              <section>
                <SectionTitle icon={Flame}>{t("search.hub.trending")}</SectionTitle>
                <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 scrollbar-hide">
                  {trending.map((item, index) => (
                    <button
                      key={`${item.kind}-${item.id}`}
                      type="button"
                      onClick={() => openTitle(item)}
                      className="group w-24 shrink-0 snap-start cursor-pointer text-left sm:w-28"
                    >
                      <span className="relative block aspect-2/3 overflow-hidden rounded-xl border border-line bg-elevated">
                        {item.poster && (
                          <Image
                            src={`https://image.tmdb.org/t/p/w185${item.poster}`}
                            alt=""
                            fill
                            sizes="112px"
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        )}
                        <span className="absolute top-1.5 left-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-black/75 px-1.5 text-[10px] font-black text-white">
                          {index + 1}
                        </span>
                      </span>
                      <span className="mt-1.5 block truncate text-[11px] font-bold text-fg-soft group-hover:text-foreground">
                        {item.title}
                      </span>
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
              <SectionTitle icon={Layers}>{t("search.hub.collections")}</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {COLLECTION_SHORTCUTS.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => onNavigate(`/collections/${c.slug}`)}
                    className="flex cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-tint px-3.5 py-2 text-xs font-bold text-fg-soft transition-colors hover:border-cyan-500/50 hover:text-foreground"
                  >
                    <span aria-hidden>{c.emoji}</span>
                    {loc(c.title, locale)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => onNavigate("/collections")}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-line-strong px-3.5 py-2 text-xs font-bold text-fg-muted transition-colors hover:border-cyan-500/50 hover:text-foreground"
                >
                  {t("search.hub.allCollections")}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </section>

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
                      onClick={() => onNavigate(`/genres/${id}`)}
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
                  onClick={() => onNavigate("/genres")}
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
          </>
        )}
      </div>
    </div>
  );
}
