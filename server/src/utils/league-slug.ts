import { normalizeSlugParam } from "./slug.js";

export type LeagueGender = "male" | "female";

/** Sources that ingest men's NCAA D1 data. */
export const MENS_NCAA_SOURCES = new Set(["usbasket-ncaa-d1"]);

/** Sources that ingest U Sports data. */
export const USPORTS_SOURCES = new Set(["usbasket-u-sports"]);

/** Sources that ingest women's NCAA D1 data. */
export const WOMENS_NCAA_SOURCES = new Set(["usbasket-ncaa-d1-w"]);

/** Legacy men's league slug — still used by the live scraper. */
export const LEGACY_NCAA_MENS_SLUG = "ncaa";

/** Women's NCAA league slug. */
export const NCAA_WOMENS_SLUG = "ncaa-w";

/** USBasket auto-slugs that map to pre-seeded canonical leagues. */
export const INGEST_LEAGUE_SLUG_ALIASES: Record<string, string> = {
  "australia-nbl": "nbl",
  proa: "lnb-pro-a",
  "jeep-elite-proa": "lnb-pro-a",
  "betclic-elite-proa": "lnb-pro-a",
};

/** Preferred display names for pre-seeded leagues when ingesting. */
export const CANONICAL_LEAGUE_NAMES: Record<string, string> = {
  nbl: "NBL Australia",
  bal: "Basketball Africa League",
  cba: "Chinese Basketball Association",
  "b-league": "B.League (Japan)",
  euroleague: "EuroLeague",
  acb: "Liga ACB",
  "lnb-pro-a": "LNB Pro A",
  "lnb-u21": "LNB Pro A U21",
};

/** Hidden from public league listings; data shown under ncaa-m instead. */
export const DEPRECATED_PUBLIC_LEAGUE_SLUGS = new Set(["ncaa"]);

export function resolveCanonicalLeagueSlug(slug: string): string {
  const normalized = normalizeSlugParam(slug);
  return INGEST_LEAGUE_SLUG_ALIASES[normalized] ?? normalized;
}

export function isWomensNcaaIngest(source: string, slug: string): boolean {
  const normalized = normalizeSlugParam(slug);
  return (
    normalized === NCAA_WOMENS_SLUG ||
    (normalized === LEGACY_NCAA_MENS_SLUG && WOMENS_NCAA_SOURCES.has(source))
  );
}

export function resolveIngestLeagueSlug(source: string, slug: string): string {
  const normalized = resolveCanonicalLeagueSlug(slug);

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
  const normalized = resolveCanonicalLeagueSlug(slug);
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
  const normalized = resolveCanonicalLeagueSlug(slug);
  if (normalized === "ncaa-m" || normalized === LEGACY_NCAA_MENS_SLUG) {
    return "NCAA Division I (Men)";
  }
  if (normalized === NCAA_WOMENS_SLUG) return "NCAA Division I (Women)";
  return CANONICAL_LEAGUE_NAMES[normalized] ?? providedName;
}
