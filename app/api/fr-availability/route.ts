import { unstable_cache } from "next/cache";
import { checkFrAvailability, type FrKind } from "@/lib/fr-availability";

/**
 * POST /api/fr-availability  { items: [{ kind: "movie"|"tv"|"kdrama"|"anime", id }] }  (max 40)
 * → { results: { "movie:123": "vf" | "vostfr" | "both" | "fr" | "none" | "unknown" } }
 *
 * For the "VF / VOSTFR only" listing filter and the availability badges.
 * Series are checked on S1E1. Each title is cached 6 h (unknown answers aren't).
 */
type Status = "vf" | "vostfr" | "both" | "fr" | "none" | "unknown";
const KIND: Record<string, FrKind> = { movie: "movie", tv: "tv", kdrama: "drama", anime: "anime" };
const CACHE_SECONDS = 6 * 3600;
const CONCURRENCY = 8;

class Unknown extends Error {}

function statusFor(kind: FrKind, id: string): Promise<Status> {
  return unstable_cache(
    async (): Promise<Status> => {
      const r = await checkFrAvailability(kind, id);
      if (r.available === null) throw new Unknown();
      if (!r.available) return "none";
      if (r.provider === "vidzy") {
        return r.langs.includes("vf") && r.langs.includes("vostfr") ? "both" : r.langs.includes("vf") ? "vf" : "vostfr";
      }
      return /vostfr/i.test(r.version ?? "") ? "vostfr" : "fr";
    },
    ["fr-status-v1", kind, id],
    { revalidate: CACHE_SECONDS },
  )().catch(() => "unknown" as const);
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
  return Response.json({ results }, { headers: { "Cache-Control": "no-store" } });
}
