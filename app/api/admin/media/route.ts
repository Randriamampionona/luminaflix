import { checkAnalyticsAdmin } from "@/lib/analytics/admin";
import { type InfoKind, type MediaInfo, parseMediaId } from "@/lib/media-infos";
import { tmdb } from "@/lib/tmdb";

/**
 * GET /api/admin/media?type=movie|anime|kdrama&id=<TMDB id | IMDb id | URL>
 * Admin only (same check as /analytics). Used by /media-infos.
 */
interface FindResponse {
  movie_results?: { id: number }[];
  tv_results?: { id: number }[];
}

interface Details {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  tagline?: string;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  runtime?: number;
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
  genres?: { name: string }[];
  spoken_languages?: { english_name?: string; name?: string }[];
  production_countries?: { name: string }[];
  origin_country?: string[];
  external_ids?: { imdb_id?: string | null };
  imdb_id?: string | null;
  credits?: { cast?: { name: string; character?: string; profile_path?: string | null }[] };
}

const KINDS: InfoKind[] = ["movie", "anime", "kdrama", "tv"];
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request) {
  const access = await checkAnalyticsAdmin();
  if (access.status !== "admin") {
    return json({ error: "Forbidden" }, access.status === "signed-out" ? 401 : 403);
  }

  const params = new URL(request.url).searchParams;
  const kind = (KINDS as string[]).includes(params.get("type") ?? "") ? (params.get("type") as InfoKind) : "movie";
  const parsed = parseMediaId(params.get("id") ?? "");
  if (!parsed) return json({ error: "invalid-id" }, 400);

  const mediaType = kind === "movie" ? "movie" : "tv";
  let tmdbId: number | null = "tmdbId" in parsed ? parsed.tmdbId : null;

  // IMDb id → TMDB id
  if ("imdbId" in parsed) {
    const found = await tmdb<FindResponse>(
      `/find/${parsed.imdbId}`,
      { external_source: "imdb_id" },
      { localized: false },
    );
    const match = mediaType === "movie" ? found?.movie_results?.[0] : found?.tv_results?.[0];
    if (!match) {
      const other = mediaType === "movie" ? found?.tv_results?.[0] : found?.movie_results?.[0];
      return json({ error: other ? (mediaType === "movie" ? "is-series" : "is-movie") : "not-found" }, 404);
    }
    tmdbId = match.id;
  }

  const d = await tmdb<Details>(`/${mediaType}/${tmdbId}`, { append_to_response: "external_ids,credits" });
  if (!d?.id) return json({ error: "not-found" }, 404);

  const date = d.release_date || d.first_air_date || null;
  const routeBase =
    kind === "movie" ? "/movies" : kind === "anime" ? "/anime" : kind === "tv" ? "/tv-shows" : "/k-drama";
  const info: MediaInfo = {
    kind,
    tmdbId: d.id,
    imdbId: d.external_ids?.imdb_id || d.imdb_id || null,
    title: d.title || d.name || "—",
    originalTitle: d.original_title || d.original_name || null,
    tagline: d.tagline || null,
    overview: d.overview || null,
    year: date ? date.slice(0, 4) : null,
    releaseDate: date,
    posterPath: d.poster_path ?? null,
    backdropPath: d.backdrop_path ?? null,
    rating: d.vote_average ? Math.round(d.vote_average * 10) / 10 : null,
    votes: d.vote_count ?? 0,
    runtime: d.runtime || d.episode_run_time?.[0] || null,
    seasons: d.number_of_seasons ?? null,
    episodes: d.number_of_episodes ?? null,
    status: d.status || null,
    genres: (d.genres ?? []).map((g) => g.name),
    languages: (d.spoken_languages ?? []).map((l) => l.english_name || l.name || "").filter(Boolean),
    countries: d.production_countries?.length ? d.production_countries.map((c) => c.name) : (d.origin_country ?? []),
    cast: (d.credits?.cast ?? []).slice(0, 10).map((c) => ({
      name: c.name,
      character: c.character || null,
      profilePath: c.profile_path ?? null,
    })),
    pagePath: `${routeBase}/${d.id}`,
    playerPath: kind === "movie" ? `/movies/${d.id}` : `${routeBase}/play/${d.id}?s=1&e=1`,
  };
  return json(info);
}
