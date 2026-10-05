import "server-only";
import { getSearchAnime } from "@/action/get-search-anime.action";
import { getSearchKDramas } from "@/action/get-search-kdrama.action";
import { getSearchResults } from "@/action/get-search-results.action";
import { isOpenAIConfigured } from "@/lib/ai/openai";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";
import type { Movie, TMDBResponse } from "@/typing";
import { looksDescriptive, resolveSearchIntent, type SearchIntent, type SearchScope } from "./ai-intent";

/** "auto" (default) · "off" = exact words only (?ai=0) · "on" = always ask the AI (?ai=1). */
type SmartSearchMode = "auto" | "off" | "on";

export function parseSmartMode(value?: string): SmartSearchMode {
  return value === "0" ? "off" : value === "1" ? "on" : "auto";
}

export interface SmartSearchResult {
  data: TMDBResponse;
  /** Set when results come from AI-inferred titles. */
  ai: { titles: string[]; language: SearchIntent["detectedLanguage"] } | null;
}

const searchers: Record<SearchScope, (query: string, page: number) => Promise<TMDBResponse>> = {
  all: (q, p) => getSearchResults(q, p),
  anime: getSearchAnime,
  kdrama: getSearchKDramas,
};

// AI calls cost money: 30 per IP per 10 minutes (cached repeats count too).
const aiLimited = createRateLimiter({ max: 30, windowMs: 10 * 60 * 1000 });

const PER_TITLE = 8;
const MAX_RESULTS = 40;

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Search each inferred title, exact title matches first, deduplicated. */
async function searchTitles(titles: string[], scope: SearchScope): Promise<Movie[]> {
  const pages = await Promise.all(titles.map((title) => searchers[scope](title, 1)));
  const seen = new Set<string>();
  const merged: Movie[] = [];

  pages.forEach((page, index) => {
    const target = normalize(titles[index]);
    const ranked = [...page.results].sort((a, b) => {
      const exact = (m: Movie) =>
        [m.title, m.name, m.original_title, m.original_name].some((t) => t && normalize(t) === target) ? 0 : 1;
      return exact(a) - exact(b);
    });
    for (const item of ranked.slice(0, PER_TITLE)) {
      const key = `${item.media_type ?? scope}-${item.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  });
  return merged.slice(0, MAX_RESULTS);
}

async function aiSearch(query: string, scope: SearchScope): Promise<SmartSearchResult | null> {
  if (aiLimited(await getClientIp())) return null;
  const intent = await resolveSearchIntent(query, scope);
  if (!intent || intent.extractedTitles.length === 0) return null;

  const results = await searchTitles(intent.extractedTitles, scope);
  if (results.length === 0) return null;
  return {
    data: { page: 1, results, total_pages: 1, total_results: results.length },
    ai: { titles: intent.extractedTitles, language: intent.detectedLanguage },
  };
}

/**
 * Unified search pipeline for /search, /anime/search and /k-drama/search:
 * 1. Short, title-like queries → regular TMDB search.
 * 2. Descriptions ("un homme qui voyage dans le temps avec une voiture") →
 *    the AI infers 1–3 canonical titles → each is searched and merged.
 * 3. A title search with no results gets a second chance through the AI
 *    (typos, translated or half-remembered titles).
 * AI only runs on page 1; without OPENAI_API_KEY everything is plain search.
 */
export async function smartSearch({
  query,
  scope,
  page,
  mode,
}: {
  query: string;
  scope: SearchScope;
  page: number;
  mode: SmartSearchMode;
}): Promise<SmartSearchResult> {
  const aiAllowed = mode !== "off" && page === 1 && isOpenAIConfigured();

  if (aiAllowed && (mode === "on" || looksDescriptive(query))) {
    const ai = await aiSearch(query, scope);
    if (ai) return ai;
  }

  const data = await searchers[scope](query, page);
  if (aiAllowed && mode === "auto" && data.results.length === 0) {
    const ai = await aiSearch(query, scope);
    if (ai) return ai;
  }
  return { data, ai: null };
}