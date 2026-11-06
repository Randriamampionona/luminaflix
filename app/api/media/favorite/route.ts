import { toggleFavorite } from "@/action/stream-actions";
import type { MediaRef } from "@/lib/media-interactions";

/**
 * POST /api/media/favorite  { mediaId, type, season?, episode? } → FavoriteResult
 *
 * Same as the toggleFavorite server action, but called with fetch from the
 * player: a server action that revalidates a cache tag also re-renders the
 * current page, which restarted the stream being watched. Here the cache is
 * still refreshed (the Favorites page is up to date) without touching the page.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as MediaRef | null;
  if (!body || typeof body !== "object") return Response.json({ success: false, error: "INVALID" }, { status: 400 });
  try {
    return Response.json(await toggleFavorite(body), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ success: false, error: "FAILED" }, { status: 500 });
  }
}
