import "server-only";
import { getLocale } from "next-intl/server";
import { COLLECTIONS, findCollection, loc, matchCollections, type CollectionDef } from "@/lib/collections";
import { REVALIDATE, tmdb } from "@/lib/tmdb";
import type { Movie, TMDBResponse } from "@/typing";

/** Data behind /collections, its cards and the search matches (all cached a day by the TMDB layer). */
interface CollectionView {
  slug: string;
  emoji: string;
  title: string;
  tagline: string;
  backdrop: string | null;
  items: Movie[];
  /** Items are listed in release order (a franchise or a studio). */
  ordered: boolean;
}

interface TmdbCollection {
  id: number;
  name: string;
  overview?: string;
  backdrop_path?: string | null;
  poster_path?: string | null;
  parts?: Movie[];
}

const byRelease = (a: Movie, b: Movie) => (a.release_date || "9999").localeCompare(b.release_date || "9999");

async function itemsOf(def: CollectionDef): Promise<{ items: Movie[]; backdrop: string | null }> {
  const src = def.source;
  if (src.type === "collection") {
    const c = await tmdb<TmdbCollection>(`/collection/${src.id}`, {}, { revalidate: REVALIDATE.long });
    return { items: [...(c?.parts ?? [])].filter((m) => m.poster_path).sort(byRelease), backdrop: c?.backdrop_path ?? null };
  }
  const media = src.type === "company" ? "movie" : src.media;
  const params =
    src.type === "company"
      ? { with_companies: src.id, sort_by: src.sort, "vote_count.gte": 20 }
      : src.params;
  const pages = await Promise.all(
    [1, 2].map((page) => tmdb<TMDBResponse>(`/discover/${media}`, { ...params, page }, { revalidate: REVALIDATE.long })),
  );
  const items = pages
    .flatMap((p) => p?.results ?? [])
    .filter((m) => m.poster_path)
    .map((m) => ({ ...m, media_type: m.media_type ?? media }));
  return { items, backdrop: items.find((m) => m.backdrop_path)?.backdrop_path ?? null };
}

/** A curated collection by slug, or any TMDB collection as "c-<id>". */
export async function getCollection(slug: string): Promise<CollectionView | null> {
  const locale = await getLocale();
  const def = findCollection(slug);
  if (def) {
    const { items, backdrop } = await itemsOf(def);
    return {
      slug,
      emoji: def.emoji,
      title: loc(def.title, locale),
      tagline: loc(def.tagline, locale),
      backdrop,
      items,
      ordered: def.source.type !== "discover",
    };
  }
  const id = /^c-(\d{1,9})$/.exec(slug)?.[1];
  if (!id) return null;
  const c = await tmdb<TmdbCollection>(`/collection/${id}`, {}, { revalidate: REVALIDATE.long });
  if (!c?.parts?.length) return null;
  return {
    slug,
    emoji: "🎞️",
    title: c.name,
    tagline: c.overview ?? "",
    backdrop: c.backdrop_path ?? null,
    items: [...c.parts].filter((m) => m.poster_path).sort(byRelease),
    ordered: true,
  };
}

export interface CollectionCardData {
  href: string;
  emoji: string;
  title: string;
  tagline: string;
  backdrop: string | null;
  count: number;
}

/** Cards for the curated collections (home row, /collections). */
export async function getCollectionCards(limit = COLLECTIONS.length): Promise<CollectionCardData[]> {
  const locale = await getLocale();
  return Promise.all(
    COLLECTIONS.slice(0, limit).map(async (def) => {
      const { items, backdrop } = await itemsOf(def).catch(() => ({ items: [], backdrop: null }));
      return {
        href: `/collections/${def.slug}`,
        emoji: def.emoji,
        title: loc(def.title, locale),
        tagline: loc(def.tagline, locale),
        backdrop,
        count: items.length,
      };
    }),
  );
}

/** Collections matching a search: curated ones + TMDB franchises (e.g. "Shrek" → Shrek collection). */
export async function searchCollections(query: string): Promise<CollectionCardData[]> {
  const locale = await getLocale();
  const curated = matchCollections(query);
  const found = await tmdb<{ results: TmdbCollection[] }>(`/search/collection`, { query, page: 1 }, {
    revalidate: REVALIDATE.default,
  });
  const curatedCards = await Promise.all(
    curated.slice(0, 3).map(async (def) => {
      const { items, backdrop } = await itemsOf(def).catch(() => ({ items: [], backdrop: null }));
      return {
        href: `/collections/${def.slug}`,
        emoji: def.emoji,
        title: loc(def.title, locale),
        tagline: loc(def.tagline, locale),
        backdrop,
        count: items.length,
      };
    }),
  );
  const tmdbCards = (found?.results ?? [])
    .filter((c) => c.backdrop_path || c.poster_path)
    .slice(0, 4)
    .map((c) => ({
      href: `/collections/c-${c.id}`,
      emoji: "🎞️",
      title: c.name,
      tagline: "",
      backdrop: c.backdrop_path ?? c.poster_path ?? null,
      count: 0,
    }));
  return [...curatedCards, ...tmdbCards];
}
