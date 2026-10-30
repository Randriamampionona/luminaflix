import { getServerHealth } from "@/lib/server-health-server";

/** GET /api/player/health?kind=movie|anime|drama|tv&id=<tmdb> → reports per server (title + all titles). */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind") ?? "";
  const id = params.get("id") ?? "";
  if (!["movie", "anime", "drama", "tv"].includes(kind) || !/^\d{1,9}$/.test(id)) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  return Response.json(await getServerHealth(kind, id), {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800" },
  });
}
