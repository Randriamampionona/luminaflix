import { getCommunityPoster } from "@/lib/community/server";
import { isCommunityId } from "@/lib/community/types";

/** GET /api/community/poster/[id] — poster uploaded with a community video (WebP / JPEG / PNG). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isCommunityId(id)) return new Response(null, { status: 404 });
  const dataUrl = await getCommunityPoster(id).catch(() => null);
  const match = dataUrl?.match(/^data:(image\/(?:webp|jpeg|png));base64,(.+)$/);
  if (!match) return new Response(null, { status: 404 });
  return new Response(Buffer.from(match[2], "base64"), {
    headers: {
      "Content-Type": match[1],
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
