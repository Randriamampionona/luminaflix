/** What the search looks in: everything, or one section (?type= on /search/[query]). */
export const SEARCH_SCOPES = ["all", "movie", "tv", "kdrama", "anime"] as const;
export type SearchScopeKey = (typeof SEARCH_SCOPES)[number];

export const toSearchScope = (value?: string | null): SearchScopeKey =>
  (SEARCH_SCOPES as readonly string[]).includes(value ?? "") ? (value as SearchScopeKey) : "all";

/** Link to the results page for a query (section and AI setting kept in the URL). */
export function searchResultsHref(query: string, { ai, scope }: { ai: boolean; scope: SearchScopeKey }) {
  const params = new URLSearchParams();
  if (scope !== "all") params.set("type", scope);
  if (!ai) params.set("ai", "0");
  const qs = params.toString();
  return `/search/${encodeURIComponent(query)}${qs ? `?${qs}` : ""}`;
}
