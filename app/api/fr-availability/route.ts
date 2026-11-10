import { checkFrAvailability, type FrKind } from "@/lib/fr-availability";

export const dynamic = "force-dynamic";

/**
 * POST /api/fr-availability  { items: [{ kind: "movie"|"tv"|"kdrama"|"anime", id }] }  (max 40)
 * → { results: { "movie:123": "vf" | "vostfr" | "both" | "fr" | "none" | "unknown" } }
 *
 * For the "VF / VOSTFR only" listing filter and the availability badges.
 * Series are checked on S1E1. No cache: every request asks the providers live.
 */
type Status = "vf" | "vostfr" | "both" | "fr" | "none" | "unknown";
const KIND: Record<string, FrKind> = { movie: "movie", tv: "tv", kdrama: "drama", anime: "anime" };
// Few simultaneous requests to the providers.
const CONCURRENCY = 3;

/** Live, no cache: 2 attempts per provider for the cards (the player uses 4). */
async function statusFor(kind: FrKind, id: string): Promise<Status> {
  try {
    const r = await checkFrAvailability(kind, id, { attempts: 2 });
    if (r.available === null) return "unknown";
    if (!r.available) return "none";
    if (r.provider === "vidzy") {
      return r.langs.includes("vf") && r.langs.includes("vostfr") ? "both" : r.langs.includes("vf") ? "vf" : "vostfr";
    }
    return /vostfr/i.test(r.version ?? "") ? "vostfr" : "fr";
  } catch {
    return "unknown";
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { items?: { kind?: string; id?: unknown }[] } | null;
  const items = (body?.items ?? [])
    .filter((i) => i && KIND[i.kind ?? ""] && /^\d{1,9}$/.test(String(i.id)))
    .slice(0, 40)
    .map((i) => ({ key: `${i.kind}:${i.id}`, kind: KIND[i.kind!], id: String(i.id) }));

  const results: Record<string, Status> = {};
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    await Promise.all(
      items.slice(i, i + CONCURRENCY).map(async (item) => {
        results[item.key] = await statusFor(item.kind, item.id);
      }),
    );
  }
  return Response.json(
    { results },
    { headers: { "Cache-Control": "no-store, max-age=0", "CDN-Cache-Control": "no-store", "Netlify-CDN-Cache-Control": "no-store" } },
  );
}
