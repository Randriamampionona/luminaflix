import type { MetadataRoute } from "next";
import { COLLECTIONS } from "@/lib/collections";
import { isKoreanSeries } from "@/lib/media";
import { tmdb } from "@/lib/tmdb";
import type { Movie, TMDBResponse } from "@/typing";

/**
 * sitemap.xml (rebuilt daily): main pages, collections, trailer/info pages of
 * popular movies, and the K-drama / anime / TV-show pages of popular series.
 * Player pages are left out on purpose (only info pages are indexed).
 */
export const revalidate = 86400;

const DOMAIN = (process.env.NEXT_PUBLIC_DOMAIN || "https://lumina-flix.vercel.app").replace(/\/+$/, "");

async function pages(path: string, params: Record<string, string | number>, count: number): Promise<Movie[]> {
  const results = await Promise.all(
    Array.from({ length: count }, (_, i) =>
      tmdb<TMDBResponse>(path, { ...params, page: i + 1 }, { revalidate, localized: false }),
    ),
  );
  return results.flatMap((r) => r?.results ?? []);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages = ["", "/movies", "/tv-shows", "/k-drama", "/anime", "/new-popular", "/genres", "/collections", "/coming-soon", "/user-rank", "/download_app", "/help"];

  const [movies, kdramas, anime, tv] = await Promise.all([
    pages("/movie/popular", {}, 5),
    pages("/discover/tv", { with_origin_country: "KR", sort_by: "popularity.desc" }, 3),
    pages("/discover/tv", { with_genres: 16, with_origin_country: "JP", sort_by: "popularity.desc" }, 3),
    pages("/tv/popular", {}, 3),
  ]);

  const seen = new Set<string>();
  const entry = (path: string, priority: number): MetadataRoute.Sitemap[number] | null => {
    if (seen.has(path)) return null;
    seen.add(path);
    return { url: `${DOMAIN}${path}`, lastModified: now, changeFrequency: "weekly", priority };
  };

  return [
    ...staticPages.map((p) => entry(p, p === "" ? 1 : 0.8)),
    ...COLLECTIONS.map((c) => entry(`/collections/${c.slug}`, 0.7)),
    ...movies.map((m) => entry(`/trailer/${m.id}?type=movie`, 0.6)),
    ...kdramas.map((s) => entry(`/k-drama/${s.id}`, 0.6)),
    ...anime.map((s) => entry(`/anime/${s.id}`, 0.6)),
    ...tv.filter((s) => !isKoreanSeries(s) && !(s.genre_ids?.includes(16) && s.origin_country?.includes("JP"))).map((s) => entry(`/tv-shows/${s.id}`, 0.5)),
  ].filter((e): e is MetadataRoute.Sitemap[number] => e !== null);
}
