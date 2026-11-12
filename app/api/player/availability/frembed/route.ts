import { checkFrembed } from "@/lib/frembed";
import { NO_STORE, readAvailabilityParams } from "@/lib/player-availability-request";

export const dynamic = "force-dynamic";

/**
 * GET /api/player/availability/frembed?kind=…&id=<tmdb>&imdb=<tt…>&s=&e=
 * → { frembed: true | false | null, frembedImdb: true | false | null, version }
 * Frembed's official API, live (lib/frembed.ts), within an 8 s budget.
 */
export async function GET(request: Request) {
  const p = readAvailabilityParams(request);
  if (!p) return Response.json({ error: "invalid" }, { status: 400, headers: NO_STORE });
  const answer = await checkFrembed(p.kind, p.id, { imdb: p.imdb, season: p.season, episode: p.episode });
  return Response.json(
    { frembed: answer.tmdb, frembedImdb: answer.imdb, version: answer.version },
    { headers: NO_STORE },
  );
}
