import { checkFrAvailability, FR_CACHE_SECONDS, type FrKind } from "@/lib/fr-availability";

/**
 * GET /api/player/availability?kind=movie|anime|drama|tv&id=<tmdb>&imdb=<tt…>&s=<season>&e=<episode>
 * → { available: true | false | null, provider: "vidzy" | "frembed" | null, langs, lang, version }
 * Logic in lib/fr-availability.ts. Cached 10 min on the CDN (unknown answers aren't cached).
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind") as FrKind;
  const id = params.get("id") ?? "";
  const imdb = params.get("imdb") ?? "";
  const season = Number(params.get("s") || 1);
  const episode = Number(params.get("e") || 1);

  if (!["movie", "anime", "drama", "tv"].includes(kind) || !/^\d{1,9}$/.test(id)) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  if (!Number.isInteger(season) || !Number.isInteger(episode) || season < 0 || episode < 1) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }

  const result = await checkFrAvailability(kind, id, { imdb, season, episode });
  return Response.json(result, {
    headers: {
      "Cache-Control":
        result.available === null
          ? "no-store"
          : `public, s-maxage=${FR_CACHE_SECONDS}, stale-while-revalidate=${FR_CACHE_SECONDS * 6}`,
    },
  });
}
