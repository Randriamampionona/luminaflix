import { checkFrAvailability } from "@/lib/fr-availability";
import { NO_STORE, readAvailabilityParams } from "@/lib/player-availability-request";

// Always run on request, never stored.
export const dynamic = "force-dynamic";

/**
 * GET /api/player/availability?kind=movie|anime|drama|tv&id=<tmdb>&imdb=<tt…>&s=<season>&e=<episode>
 * → { available, provider, langs, lang, version, vidzy, frembed, frembedImdb }
 * Combined answer (answers as soon as VIDZY confirms). The player itself now
 * asks …/vidzy and …/frembed separately; this one stays for older tabs.
 */
export async function GET(request: Request) {
  const p = readAvailabilityParams(request);
  if (!p) return Response.json({ error: "invalid" }, { status: 400, headers: NO_STORE });
  const result = await checkFrAvailability(p.kind, p.id, { imdb: p.imdb, season: p.season, episode: p.episode });
  return Response.json(result, { headers: NO_STORE });
}
