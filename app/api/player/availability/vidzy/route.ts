import { NO_STORE, readAvailabilityParams } from "@/lib/player-availability-request";
import { checkVidzy } from "@/lib/vidzy";

export const dynamic = "force-dynamic";

/**
 * GET /api/player/availability/vidzy?kind=…&id=<tmdb>
 * → { vidzy: true | false | null, langs: ["vf", "vostfr"] }
 * VIDZY's official API, live (lib/vidzy.ts). The player asks this and the
 * Frembed route at the same time, so VIDZY's answer shows up on its own.
 */
export async function GET(request: Request) {
  const p = readAvailabilityParams(request);
  if (!p) return Response.json({ error: "invalid" }, { status: 400, headers: NO_STORE });
  const answer = await checkVidzy(p.id, p.kind === "movie");
  return Response.json({ vidzy: answer.available, langs: answer.langs }, { headers: NO_STORE });
}
