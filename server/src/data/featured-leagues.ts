/** Curated leagues shown by default on the leagues browse page. */
export const FEATURED_LEAGUE_SLUGS = [
  "nba",
  "wnba",
  "g-league",
  "ncaa-m",
  "ncaa-d2",
  "ncaa-d3",
  "naia",
  "juco",
  "u-sports",
  "ccaa",
  "ncaa-w",
  "ote",
  "euroleague",
  "acb",
  "lnb-pro-a",
  "nbl",
  "bal",
  "cba",
  "b-league",
  "high-school",
] as const;

export type FeaturedLeagueSlug = (typeof FEATURED_LEAGUE_SLUGS)[number];

export function dbSlugForFeaturedLeague(slug: string): string {
  return slug === "ncaa-m" ? "ncaa" : slug;
}
