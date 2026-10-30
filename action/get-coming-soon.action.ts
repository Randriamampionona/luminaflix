import "server-only";
import { REVALIDATE, tmdb } from "@/lib/tmdb";
import type { Movie, TMDBResponse } from "@/typing";

/**
 * Movies coming out in French cinemas (TMDB "upcoming", region FR) plus the
 * ones released in the last 6 weeks — the ones people wait for in VF / VOSTFR.
 * Sorted by date, cached 6 h.
 */
export async function getComingSoon(): Promise<Movie[]> {
  const today = new Date();
  const from = new Date(today.getTime() - 42 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const to = new Date(today.getTime() + 120 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const pages = await Promise.all(
    [1, 2, 3].map((page) =>
      tmdb<TMDBResponse>(
        "/discover/movie",
        {
          region: "FR",
          with_release_type: "2|3",
          "release_date.gte": from,
          "release_date.lte": to,
          sort_by: "popularity.desc",
          page,
        },
        { revalidate: REVALIDATE.default * 6 },
      ),
    ),
  );
  const seen = new Set<number>();
  return pages
    .flatMap((p) => p?.results ?? [])
    .filter(
      (m) =>
        m.poster_path &&
        /^\d{4}-\d{2}-\d{2}$/.test(m.release_date ?? "") &&
        !Number.isNaN(Date.parse(m.release_date!)) &&
        !seen.has(m.id) &&
        seen.add(m.id),
    )
    .sort((a, b) => (a.release_date ?? "").localeCompare(b.release_date ?? ""));
}
