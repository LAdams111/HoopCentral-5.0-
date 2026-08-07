/** Curated players shown in the homepage Featured Athletes section. */
export const FEATURED_PLAYER_SLUGS = [
  "dybantsa-aj",
  "ace-bailey",
  "cameron-boozer-2",
  "aj-dybantsa-jr",
  "dakari-spear-2",
] as const;

export type FeaturedPlayerSlug = (typeof FEATURED_PLAYER_SLUGS)[number];
