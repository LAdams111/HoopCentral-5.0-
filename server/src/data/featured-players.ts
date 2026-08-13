/**
 * Curated players shown in the homepage Featured Athletes section.
 * Intentional mix: 3 high-school + 2 NCAA D1 profiles with complete bios/stats.
 */
export const FEATURED_PLAYER_SLUGS = [
  // High school — multi-year same-school MaxPreps careers, full bio + headshot
  "jason-crowe-3",
  "zymicah-wilkins",
  "cameron-lomax",
  // NCAA D1 — multi-season college careers, full bio + headshot
  "antoine-davis",
  "tramon-mark",
] as const;

export type FeaturedPlayerSlug = (typeof FEATURED_PLAYER_SLUGS)[number];
