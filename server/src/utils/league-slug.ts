import { normalizeSlugParam } from "./slug.js";

export type LeagueGender = "male" | "female";

/** Legacy ingest slug → canonical league slug. */
export const INGEST_LEAGUE_ALIASES: Record<string, string> = {
  ncaa: "ncaa-m",
};

/** Sources that ingest men's NCAA D1 data. */
export const MENS_NCAA_SOURCES = new Set(["usbasket-ncaa-d1"]);

/** Sources that ingest women's NCAA D1 data. */
export const WOMENS_NCAA_SOURCES = new Set(["usbasket-ncaa-d1-w"]);

/** Hidden from public league listings; ingest alias only. */
export const DEPRECATED_PUBLIC_LEAGUE_SLUGS = new Set(["ncaa"]);

export function resolveIngestLeagueSlug(source: string, slug: string): string {
  const normalized = normalizeSlugParam(slug);

  if (normalized === "ncaa-m" || normalized === "ncaa-w") {
    return normalized;
  }

  if (normalized === "ncaa") {
    if (WOMENS_NCAA_SOURCES.has(source)) return "ncaa-w";
    if (MENS_NCAA_SOURCES.has(source)) return "ncaa-m";
    return INGEST_LEAGUE_ALIASES.ncaa;
  }

  return INGEST_LEAGUE_ALIASES[normalized] ?? normalized;
}

export function resolvePublicLeagueSlug(slug: string): string {
  const normalized = normalizeSlugParam(slug);
  if (normalized === "ncaa") return "ncaa-m";
  return normalized;
}

export function leagueGenderForSlug(slug: string): LeagueGender | null {
  const normalized = normalizeSlugParam(slug);
  if (normalized === "ncaa-m") return "male";
  if (normalized === "ncaa-w") return "female";
  return null;
}

export function canonicalLeagueName(slug: string, providedName: string): string {
  const normalized = normalizeSlugParam(slug);
  if (normalized === "ncaa-m") return "NCAA Division I (Men)";
  if (normalized === "ncaa-w") return "NCAA Division I (Women)";
  return providedName;
}
