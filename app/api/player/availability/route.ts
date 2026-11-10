import { checkFrAvailability, type FrKind } from "@/lib/fr-availability";

// Always run on request, never stored.
export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Netlify-CDN-Cache-Control": "no-store",
};

/**
 * GET /api/player/availability?kind=movie|anime|drama|tv&id=<tmdb>&imdb=<tt…>&s=<season>&e=<episode>
 * → { available: true | false | null, provider: "vidzy" | "frembed" | null, langs, lang, version }
 * Logic in lib/fr-availability.ts. Never cached: every call asks VIDZY and Frembed live.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind") as FrKind;
  const id = params.get("id") ?? "";
  const imdb = params.get("imdb") ?? "";
  const season = Number(params.get("s") || 1);
  const episode = Number(params.get("e") || 1);

  if (!["movie", "anime", "drama", "tv"].includes(kind) || !/^\d{1,9}$/.test(id)) {
    return Response.json({ error: "invalid" }, { status: 400, headers: NO_STORE });
  }
  if (!Number.isInteger(season) || !Number.isInteger(episode) || season < 0 || episode < 1) {
    return Response.json({ error: "invalid" }, { status: 400, headers: NO_STORE });
  }

  const result = await checkFrAvailability(kind, id, { imdb, season, episode });
  return Response.json(result, { headers: NO_STORE });
}
