"use client";

import {
  CalendarDays,
  Check,
  Clapperboard,
  Clock,
  Copy,
  ExternalLink,
  Film,
  Globe2,
  Hash,
  Languages,
  Layers,
  Loader2,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Tv,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import ShareCard from "@/components/share/share-card";
import { type InfoKind, type MediaInfo, parseMediaId } from "@/lib/media-infos";
import { tmdbImage } from "@/lib/media";
import { cn } from "@/lib/utils";

const KINDS: { key: InfoKind; label: string; icon: LucideIcon }[] = [
  { key: "movie", label: "Movie", icon: Film },
  { key: "anime", label: "Anime", icon: Sparkles },
  { key: "kdrama", label: "K-Drama", icon: Tv },
];

const ERRORS: Record<string, string> = {
  "invalid-id": "That doesn't look like a TMDB id, an IMDb id (tt…) or a TMDB / IMDb link.",
  "not-found": "Nothing found with this id. Check the id and the type (Movie / Anime / K-Drama).",
  "is-series": "This IMDb id is a series — switch to Anime or K-Drama.",
  "is-movie": "This IMDb id is a movie — switch to Movie.",
  forbidden: "Your session expired. Sign in again as the admin.",
  network: "Couldn't reach the server. Check your connection and try again.",
};

// ----------------------------------------------------------- recents --
const RECENT_KEY = "lf_media_infos_recent";
const RECENT_EVENT = "lf:media-infos-recent";
type Recent = { kind: InfoKind; id: string; title: string };
const EMPTY: Recent[] = [];
let cache: { raw: string | null; list: Recent[] } = { raw: null, list: EMPTY };
const readRecent = () => {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (raw !== cache.raw) cache = { raw, list: raw ? (JSON.parse(raw) as Recent[]) : EMPTY };
    return cache.list;
  } catch {
    return EMPTY;
  }
};
const subscribeRecent = (cb: () => void) => {
  window.addEventListener(RECENT_EVENT, cb);
  return () => window.removeEventListener(RECENT_EVENT, cb);
};
const pushRecent = (item: Recent) => {
  try {
    const next = [item, ...readRecent().filter((r) => !(r.kind === item.kind && r.id === item.id))].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(RECENT_EVENT));
  } catch {
    // storage blocked
  }
};

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      title={`Copy ${label}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          toast.success(`${label} copied`);
          setTimeout(() => setDone(false), 1500);
        } catch {
          toast.error("Couldn't copy");
        }
      }}
      className="cursor-pointer rounded-md p-1 text-fg-faint transition-colors hover:bg-tint hover:text-brand"
    >
      {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
    </button>
  );
}

function Fact({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-tint-soft p-4">
      <p className="flex items-center gap-1.5 text-[10px] font-black tracking-wider text-fg-faint uppercase">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </p>
      <div className="mt-1.5 text-sm font-semibold break-words text-foreground">{children}</div>
    </div>
  );
}

/** Admin tool: look up a title by TMDB / IMDb id, see its details and share it. */
export default function MediaInfosExplorer({ initialKind, initialId }: { initialKind: InfoKind; initialId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [kind, setKind] = useState<InfoKind>(initialKind);
  const [query, setQuery] = useState(initialId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<MediaInfo | null>(null);
  const recent = useSyncExternalStore(subscribeRecent, readRecent, () => EMPTY);
  const inputRef = useRef<HTMLInputElement>(null);

  const lookup = useCallback(
    async (nextKind: InfoKind, value: string) => {
      const id = value.trim();
      if (!id) return;
      if (!parseMediaId(id)) {
        setError(ERRORS["invalid-id"]);
        return;
      }
      setLoading(true);
      setError(null);
      router.replace(`${pathname}?type=${nextKind}&id=${encodeURIComponent(id)}`, { scroll: false });
      try {
        const res = await fetch(`/api/admin/media?type=${nextKind}&id=${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        const body = await res.json();
        if (!res.ok) {
          setInfo(null);
          setError(ERRORS[res.status === 401 || res.status === 403 ? "forbidden" : body.error] ?? ERRORS["not-found"]);
          return;
        }
        setInfo(body as MediaInfo);
        pushRecent({ kind: nextKind, id, title: (body as MediaInfo).title });
      } catch {
        setError(ERRORS.network);
      } finally {
        setLoading(false);
      }
    },
    [pathname, router],
  );

  // Opened with ?type=&id= (shared admin link, back button): look it up right away.
  const initial = useRef({ kind: initialKind, id: initialId });
  useEffect(() => {
    if (initial.current.id) void lookup(initial.current.kind, initial.current.id);
    else inputRef.current?.focus();
  }, [lookup]);

  const backdrop = tmdbImage(info?.backdropPath);
  const poster = tmdbImage(info?.posterPath);
  const shareKind = info?.kind === "kdrama" ? "drama" : (info?.kind ?? "movie");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="flex items-center gap-2 text-[10px] font-black tracking-[0.3em] text-brand uppercase">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Admin · Media infos
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          Media lookup<span className="text-brand">.</span>
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          Paste a TMDB id, an IMDb id (tt…) or a TMDB / IMDb link to see a title&apos;s details and share it.
        </p>
      </div>

      {/* Search */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void lookup(kind, query);
        }}
        className="space-y-4 rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-6"
      >
        <div
          role="radiogroup"
          aria-label="Type"
          className="flex w-fit rounded-xl border border-line-strong bg-tint p-1"
        >
          {KINDS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={kind === key}
              onClick={() => {
                setKind(key);
                if (query.trim()) void lookup(key, query);
              }}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-colors",
                kind === key ? "bg-cyan-500 text-black shadow" : "text-fg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex flex-1 items-center gap-3 rounded-2xl border border-line-strong bg-background/70 px-4 focus-within:border-cyan-500/60 focus-within:ring-4 focus-within:ring-cyan-500/10">
            <Search className="h-5 w-5 shrink-0 text-fg-faint" aria-hidden />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 1630409, tt0111161 or a TMDB / IMDb link"
              aria-label="TMDB or IMDb id"
              className="min-w-0 flex-1 bg-transparent py-3.5 font-mono text-sm text-foreground outline-none placeholder:font-sans placeholder:text-fg-faint"
            />
          </label>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-6 py-3.5 text-[11px] font-black tracking-widest text-black uppercase transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Search className="h-4 w-4" aria-hidden />
            )}
            Look up
          </button>
        </div>

        {recent.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black tracking-wider text-fg-faint uppercase">Recent</span>
            {recent.map((r) => (
              <button
                key={`${r.kind}-${r.id}`}
                type="button"
                onClick={() => {
                  setKind(r.kind);
                  setQuery(r.id);
                  void lookup(r.kind, r.id);
                }}
                className="max-w-56 cursor-pointer truncate rounded-full border border-line-strong bg-tint px-3 py-1.5 text-xs font-semibold text-fg-soft transition-colors hover:border-cyan-500/40 hover:text-foreground"
              >
                {KINDS.find((k) => k.key === r.kind)?.label} · {r.title}
              </button>
            ))}
          </div>
        )}
      </form>

      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-semibold text-amber-700 dark:text-amber-300"
        >
          {error}
        </p>
      )}

      {loading && !info && <div className="skeleton h-96 rounded-4xl" aria-hidden />}

      {!info && !loading && !error && (
        <div className="flex flex-col items-center gap-3 rounded-4xl border border-dashed border-line-strong py-16 text-center">
          <Clapperboard className="h-10 w-10 text-fg-faint" aria-hidden />
          <p className="text-sm font-bold text-foreground">Look up a movie, an anime or a K-drama</p>
          <p className="max-w-sm text-xs text-fg-subtle">
            Pick the type, paste its id and press Enter. The link to share appears with the details.
          </p>
        </div>
      )}

      {info && (
        <div className={cn("space-y-6 transition-opacity", loading && "opacity-50")}>
          {/* Hero */}
          <section className="dark relative overflow-hidden rounded-4xl border border-line bg-[#0a0a0c] text-white">
            {backdrop && (
              <Image src={backdrop} alt="" fill sizes="100vw" className="object-cover opacity-40" priority />
            )}
            <div className="absolute inset-0 bg-linear-to-t from-[#0a0a0c] via-[#0a0a0c]/80 to-transparent" />
            <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:p-8">
              {poster && (
                <div className="relative aspect-2/3 w-36 shrink-0 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/15 sm:w-44">
                  <Image src={poster} alt={info.title} fill sizes="176px" className="object-cover" />
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-3">
                <span className="inline-flex rounded-md bg-cyan-500 px-2 py-0.5 text-[10px] font-black tracking-widest text-black uppercase">
                  {KINDS.find((k) => k.key === info.kind)?.label}
                </span>
                <h2 className="text-3xl leading-tight font-black tracking-tight sm:text-4xl">{info.title}</h2>
                {info.originalTitle && info.originalTitle !== info.title && (
                  <p className="text-sm text-zinc-400">{info.originalTitle}</p>
                )}
                {info.tagline && <p className="text-sm text-zinc-300 italic">“{info.tagline}”</p>}
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  {info.year && <span className="rounded-full bg-white/10 px-3 py-1">{info.year}</span>}
                  {info.rating !== null && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-3 py-1 text-amber-300">
                      <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
                      {info.rating.toFixed(1)} · {info.votes.toLocaleString()} votes
                    </span>
                  )}
                  {info.runtime && (
                    <span className="rounded-full bg-white/10 px-3 py-1">
                      {info.runtime} min{info.kind !== "movie" ? " / ep." : ""}
                    </span>
                  )}
                  {info.seasons && (
                    <span className="rounded-full bg-white/10 px-3 py-1">
                      {info.seasons} season{info.seasons > 1 ? "s" : ""} · {info.episodes ?? "?"} episodes
                    </span>
                  )}
                  {info.status && <span className="rounded-full bg-white/10 px-3 py-1">{info.status}</span>}
                </div>
                {info.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {info.genres.map((g) => (
                      <span key={g} className="rounded-md border border-white/15 px-2 py-0.5 text-[11px] text-zinc-300">
                        {g}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Link
                    href={info.playerPath}
                    className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[11px] font-black tracking-widest text-black uppercase transition-colors hover:bg-cyan-400"
                  >
                    <Play className="h-4 w-4 fill-current" aria-hidden />
                    Open player
                  </Link>
                  {info.kind !== "movie" && (
                    <Link
                      href={info.pagePath}
                      className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-[11px] font-black tracking-widest uppercase transition-colors hover:bg-white/20"
                    >
                      <Layers className="h-4 w-4" aria-hidden />
                      Episodes
                    </Link>
                  )}
                  <a
                    href={`https://www.themoviedb.org/${info.kind === "movie" ? "movie" : "tv"}/${info.tmdbId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-[11px] font-black tracking-widest uppercase transition-colors hover:bg-white/10"
                  >
                    TMDB <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                  {info.imdbId && (
                    <a
                      href={`https://www.imdb.com/title/${info.imdbId}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-[11px] font-black tracking-widest uppercase transition-colors hover:bg-white/10"
                    >
                      IMDb <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Share */}
          <ShareCard
            info={{
              title: info.title,
              kind: shareKind,
              path: info.kind === "movie" ? info.playerPath : info.pagePath,
              posterPath: info.posterPath,
              overview: info.overview,
              year: info.year,
              rating: info.rating,
              seasons: info.seasons,
              episodes: info.episodes,
            }}
          />

          {/* Details */}
          <div className="grid gap-4 lg:grid-cols-3">
            <section className="rounded-3xl border border-line bg-surface p-6 lg:col-span-2">
              <h3 className="text-sm font-black text-foreground">Overview</h3>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">{info.overview || "No overview available."}</p>
            </section>
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              <Fact icon={Hash} label="TMDB id">
                <span className="flex items-center gap-1 font-mono">
                  {info.tmdbId}
                  <CopyButton value={String(info.tmdbId)} label="TMDB id" />
                </span>
              </Fact>
              <Fact icon={Hash} label="IMDb id">
                {info.imdbId ? (
                  <span className="flex items-center gap-1 font-mono">
                    {info.imdbId}
                    <CopyButton value={info.imdbId} label="IMDb id" />
                  </span>
                ) : (
                  "—"
                )}
              </Fact>
            </section>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Fact icon={CalendarDays} label={info.kind === "movie" ? "Release date" : "First aired"}>
              {info.releaseDate ?? "—"}
            </Fact>
            <Fact icon={Clock} label={info.kind === "movie" ? "Runtime" : "Episode length"}>
              {info.runtime ? `${info.runtime} min` : "—"}
            </Fact>
            <Fact icon={Languages} label="Languages">
              {info.languages.join(", ") || "—"}
            </Fact>
            <Fact icon={Globe2} label="Countries">
              {info.countries.join(", ") || "—"}
            </Fact>
          </div>

          {info.cast.length > 0 && (
            <section className="rounded-3xl border border-line bg-surface p-6">
              <h3 className="mb-4 text-sm font-black text-foreground">Cast</h3>
              <ul className="no-scrollbar flex gap-4 overflow-x-auto pb-1">
                {info.cast.map((person) => {
                  const photo = tmdbImage(person.profilePath);
                  return (
                    <li key={`${person.name}-${person.character}`} className="w-24 shrink-0 text-center">
                      <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full bg-tint-strong ring-1 ring-line-strong">
                        {photo ? (
                          <Image src={photo} alt={person.name} fill sizes="96px" className="object-cover" />
                        ) : (
                          <span className="flex h-full items-center justify-center text-xl font-black text-fg-faint">
                            {person.name[0]}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 truncate text-xs font-bold text-foreground">{person.name}</p>
                      {person.character && <p className="truncate text-[11px] text-fg-subtle">{person.character}</p>}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
