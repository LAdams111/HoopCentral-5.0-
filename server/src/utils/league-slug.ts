import { normalizeSlugParam } from "./slug.js";

export type LeagueGender = "male" | "female";

/** Sources that ingest men's NCAA D1 data. */
export const MENS_NCAA_SOURCES = new Set(["usbasket-ncaa-d1"]);

/** Sources that ingest women's NCAA D1 data. */
export const WOMENS_NCAA_SOURCES = new Set(["usbasket-ncaa-d1-w"]);

/** Legacy men's league slug — still used by the live scraper. */
export const LEGACY_NCAA_MENS_SLUG = "ncaa";

/** Women's NCAA league slug. */
export const NCAA_WOMENS_SLUG = "ncaa-w";

/** Hidden from public league listings; data shown under ncaa-m instead. */
export const DEPRECATED_PUBLIC_LEAGUE_SLUGS = new Set(["ncaa"]);

export function isWomensNcaaIngest(source: string, slug: string): boolean {
  const normalized = normalizeSlugParam(slug);
  return (
    normalized === NCAA_WOMENS_SLUG ||
    (normalized === LEGACY_NCAA_MENS_SLUG && WOMENS_NCAA_SOURCES.has(source))
  );
}

export function resolveIngestLeagueSlug(source: string, slug: string): string {
  const normalized = normalizeSlugParam(slug);

  if (isWomensNcaaIngest(source, normalized)) {
    return NCAA_WOMENS_SLUG;
  }

  if (
    normalized === LEGACY_NCAA_MENS_SLUG ||
    normalized === "ncaa-m" ||
    MENS_NCAA_SOURCES.has(source)
  ) {
    return LEGACY_NCAA_MENS_SLUG;
  }

  return normalized;
}

export function resolvePublicLeagueSlug(slug: string): string {
  const normalized = normalizeSlugParam(slug);
  if (normalized === LEGACY_NCAA_MENS_SLUG || normalized === "ncaa-m") {
    return "ncaa-m";
  }
  return normalized;
}

export function leagueGenderForSlug(slug: string): LeagueGender | null {
  const normalized = normalizeSlugParam(slug);
  if (normalized === "ncaa-m" || normalized === LEGACY_NCAA_MENS_SLUG) {
    return "male";
  }
  if (normalized === NCAA_WOMENS_SLUG) return "female";
  return null;
}

export function canonicalLeagueName(slug: string, providedName: string): string {
  const normalized = normalizeSlugParam(slug);
  if (normalized === "ncaa-m" || normalized === LEGACY_NCAA_MENS_SLUG) {
    return "NCAA Division I (Men)";
  }
  if (normalized === NCAA_WOMENS_SLUG) return "NCAA Division I (Women)";
  return providedName;
}
