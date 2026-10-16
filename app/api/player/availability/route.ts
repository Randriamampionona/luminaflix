/**
 * GET /api/player/availability?kind=movie|anime|drama&id=<tmdb>&imdb=<tt…>&s=<season>&e=<episode>
 * → { available: true | false | null, version: "VF" | "VOSTFR" | … | null }
 *
 * Asks Frembed's public JSON API (https://frembed.bar/api-docs) whether the
 * title / episode exists, so the player can offer an English server instead
 * of an empty French player. `available: null` = couldn't tell (API down,
 * timeout): the player then behaves as before.
 *
 * - Movie:  /api/public/v1/movies/{id}          → result.total (absent = 200 with total 0)
 * - Series: /api/public/v1/tv/{id}?sa=&epi=     → result.totalItems
 * - Anime:  /api/public/v1/anime/{id}?sa=&epi=  → 404 when absent; also checks /tv as a fallback
 *
 * Results are cached 10 min (server + CDN): one Frembed call per title, not per viewer.
 */
const FREMBED_API = `${process.env.FREMBED_BASE_URL || "https://frembed.bar"}/api/public/v1`;
const CACHE_SECONDS = 600;

type Kind = "movie" | "anime" | "drama";
type Check = { available: boolean | null; version: string | null };

interface FrembedResponse {
  status?: number;
  result?: { total?: number; totalItems?: number; items?: { version?: string | null }[] };
}

async function frembed(path: string): Promise<FrembedResponse | "not-found" | null> {
  try {
    const res = await fetch(`${FREMBED_API}${path}`, {
      next: { revalidate: CACHE_SECONDS },
      signal: AbortSignal.timeout(4000),
      headers: { Accept: "application/json" },
    });
    if (res.status === 404) return "not-found";
    if (!res.ok) return null;
    return (await res.json()) as FrembedResponse;
  } catch {
    return null;
  }
}

function toCheck(data: FrembedResponse | "not-found" | null): Check {
  if (data === null) return { available: null, version: null };
  if (data === "not-found") return { available: false, version: null };
  const count = data.result?.total ?? data.result?.totalItems ?? 0;
  return { available: count > 0, version: data.result?.items?.[0]?.version ?? null };
}

/** First positive answer wins; "unknown" only if nothing could be checked. */
function combine(...checks: Check[]): Check {
  return (
    checks.find((c) => c.available === true) ??
    checks.find((c) => c.available === false) ?? { available: null, version: null }
  );
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind") as Kind;
  const id = params.get("id") ?? "";
  const imdb = params.get("imdb") ?? "";
  const season = Number(params.get("s") || 1);
  const episode = Number(params.get("e") || 1);

  if (!["movie", "anime", "drama"].includes(kind) || !/^\d{1,9}$/.test(id)) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  if (!Number.isInteger(season) || !Number.isInteger(episode) || season < 0 || episode < 1) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }

  let result: Check;
  if (kind === "movie") {
    // Frembed has two FR players for movies (TMDB and IMDb ids): available if either id is known.
    const byTmdb = toCheck(await frembed(`/movies/${id}`));
    result =
      byTmdb.available !== true && /^tt\d{5,10}$/.test(imdb)
        ? combine(byTmdb, toCheck(await frembed(`/movies/${imdb}`)))
        : byTmdb;
  } else {
    const query = `?sa=${season}&epi=${episode}`;
    if (kind === "anime") {
      const asAnime = toCheck(await frembed(`/anime/${id}${query}`));
      result = asAnime.available === true ? asAnime : combine(asAnime, toCheck(await frembed(`/tv/${id}${query}`)));
    } else {
      result = toCheck(await frembed(`/tv/${id}${query}`));
    }
  }

  return Response.json(result, {
    headers: {
      // Unknown answers aren't cached long, so a short Frembed outage doesn't stick.
      "Cache-Control":
        result.available === null
          ? "no-store"
          : `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS * 6}`,
    },
  });
}
