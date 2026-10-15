/** First-page sizes the public site already requests. */
export const PUBLIC_BROWSE_LIMIT = 50;
export const PUBLIC_SEARCH_LIMIT = 100;

export interface PublicPlayerListParams {
  q?: string;
  limit: number;
  league?: string;
  page: 1;
}

/**
 * Homepage calls /api/players with no query (top 50).
 * Search calls it with 2+ characters and limit 5 or 100, always the first page.
 * Deeper pages are ignored so the catalog cannot be walked.
 */
export function publicPlayerListParams(query: {
  q?: unknown;
  limit?: unknown;
  league?: unknown;
}): PublicPlayerListParams {
  const rawQ = typeof query.q === "string" ? query.q.trim() : "";
  const q = rawQ.length >= 2 ? rawQ : undefined;
  const league =
    typeof query.league === "string" && query.league.trim()
      ? query.league
      : undefined;

  const requested = Number(query.limit);
  const cap = q ? PUBLIC_SEARCH_LIMIT : PUBLIC_BROWSE_LIMIT;
  const fallback = PUBLIC_BROWSE_LIMIT;
  const limit = Number.isFinite(requested)
    ? Math.min(cap, Math.max(1, Math.floor(requested)))
    : fallback;

  return { q, limit, league, page: 1 };
}
