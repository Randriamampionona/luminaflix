import { isOpenAIConfigured } from "@/lib/ai/openai";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";
import { resolveSearchIntent, type SearchScope } from "@/lib/search/ai-intent";

/**
 * POST /api/search/ai-intent   { "query": "...", "scope": "all" | "anime" | "kdrama" }
 * → { "detectedLanguage": "mg", "isTitleQuery": false, "extractedTitles": ["Death Note", "Code Geass"] }
 *
 * The search pages call the same resolver directly on the server; this route
 * exposes it to client-side features (suggestions, previews…).
 */
const limited = createRateLimiter({ max: 20, windowMs: 10 * 60 * 1000 });
const SCOPES: SearchScope[] = ["all", "anime", "kdrama"];

export async function POST(request: Request) {
  if (!isOpenAIConfigured()) {
    return Response.json({ error: "AI search is not configured" }, { status: 501 });
  }
  if (limited(await getClientIp())) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: { query?: unknown; scope?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  const scope = SCOPES.includes(body.scope as SearchScope) ? (body.scope as SearchScope) : "all";
  if (query.length < 2 || query.length > 300) {
    return Response.json({ error: "query must be 2–300 characters" }, { status: 400 });
  }

  const intent = await resolveSearchIntent(query, scope);
  if (!intent) return Response.json({ error: "Could not resolve the query" }, { status: 502 });
  return Response.json(intent, { headers: { "Cache-Control": "no-store" } });
}