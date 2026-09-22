import { resolvePublicLeagueSlug } from "./league-slug.js";

const LEAGUE_REGIONS: Record<string, readonly string[]> = {
  nba: ["US", "CA"],
  wnba: ["US"],
  "g-league": ["US", "CA", "MX"],
  ncaa: ["US"],
  "ncaa-m": ["US"],
  "ncaa-w": ["US"],
  "ncaa-d2": ["US"],
  "u-sports": ["CA"],
  ccaa: ["CA"],
  ote: ["US"],
  "high-school": ["US", "CA"],
  "high-school-w": ["US", "CA"],
  aau: ["US"],
  euroleague: ["EU"],
  acb: ["ES"],
  nbl: ["AU"],
  bal: ["ZA"],
  cba: ["CN"],
  "b-league": ["JP"],
  "lnb-pro-a": ["FR"],
  "lnb-u21": ["FR"],
  "the-basketball-league": ["US", "CA"],
  "turkey-tbl": ["TR"],
};

const NORTH_AMERICAN_CODES = new Set(["US", "CA"]);

export const NORTH_AMERICAN_LEAGUE_SLUGS = Object.entries(LEAGUE_REGIONS)
  .filter(([, regions]) => regions.some((code) => NORTH_AMERICAN_CODES.has(code)))
  .map(([slug]) => slug);

export type TeamSearchRegionPriority = 0 | 1 | 2;
export type TeamSearchCollegePriority = 0 | 1;

const PRIORITY_COLLEGE_LEAGUE_SLUGS = new Set([
  "u-sports",
  "ncaa",
  "ncaa-m",
  "ncaa-w",
  "ncaa-d2",
  "ncaa-d3",
]);

export const TEAM_SEARCH_COLLEGE_LEAGUE_SLUGS = [
  "u-sports",
  "ncaa",
  "ncaa-m",
  "ncaa-w",
  "ncaa-d2",
  "ncaa-d3",
] as const;

/** 0 = NCAA / U Sports, 1 = high school and everything else */
export function teamSearchCollegePriority(leagueSlug: string): TeamSearchCollegePriority {
  const slug = resolvePublicLeagueSlug(leagueSlug);
  if (PRIORITY_COLLEGE_LEAGUE_SLUGS.has(slug) || slug.startsWith("ncaa-")) return 0;
  return 1;
}

/** 0 = US/CA league, 1 = other known region, 2 = unknown/no region metadata */
export function teamSearchRegionPriority(leagueSlug: string): TeamSearchRegionPriority {
  const slug = resolvePublicLeagueSlug(leagueSlug);
  const regions = LEAGUE_REGIONS[slug];
  if (!regions || regions.length === 0) return 2;
  if (regions.some((code) => NORTH_AMERICAN_CODES.has(code))) return 0;
  return 1;
}
