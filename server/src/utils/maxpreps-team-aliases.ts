import { normalizeSlugParam } from "./slug.js";

export interface MaxprepsTeamIdentity {
  slug: string;
  name: string;
  abbreviation: string;
}

/** Junk / narrative duplicate slugs → canonical MaxPreps HS team (not separate squads). */
const HS_TEAM_ALIASES: Record<string, MaxprepsTeamIdentity> = {
  "montverde-fl": {
    slug: "montverde-academy-eagles-fl",
    name: "Montverde Academy Eagles Varsity Boys Basketball",
    abbreviation: "MAEVBB",
  },
  "montverde-fl-usa": {
    slug: "montverde-academy-eagles-fl",
    name: "Montverde Academy Eagles Varsity Boys Basketball",
    abbreviation: "MAEVBB",
  },
  "montverde-academy-hs-texas": {
    slug: "montverde-academy-eagles-fl",
    name: "Montverde Academy Eagles Varsity Boys Basketball",
    abbreviation: "MAEVBB",
  },
};

export const MONTEVERDE_HS_CANONICAL_SLUG = "montverde-academy-eagles-fl";
export const MONTEVERDE_HS_PURPLE_SLUG = "montverde-academy-purple-eagles-fl";

/** Slugs that were merged into main Eagles before squad split (junk only, not Purple). */
export const MONTEVERDE_HS_JUNK_DUPLICATE_SLUGS = [
  "montverde-fl",
  "montverde-fl-usa",
  "montverde-academy-hs-texas",
] as const;

const VISIBLE_MONTEVERDE_SLUGS = new Set([
  MONTEVERDE_HS_CANONICAL_SLUG,
  MONTEVERDE_HS_PURPLE_SLUG,
]);

export function normalizeMaxprepsTeamForIngest(team: MaxprepsTeamIdentity): MaxprepsTeamIdentity {
  const slugKey = normalizeSlugParam(team.slug);
  const alias = HS_TEAM_ALIASES[slugKey];
  if (!alias) return team;
  return { ...alias };
}

/** Hide parser junk Montverde pages; keep main + Purple squads visible. */
export function isHiddenMontverdeDuplicateSlug(slug: string): boolean {
  const normalized = normalizeSlugParam(slug);
  if (VISIBLE_MONTEVERDE_SLUGS.has(normalized)) return false;
  return /\bmontverde\b|\bmonteverde\b/.test(normalized);
}
