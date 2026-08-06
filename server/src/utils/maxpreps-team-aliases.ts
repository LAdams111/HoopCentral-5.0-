import { normalizeSlugParam } from "./slug.js";

export interface MaxprepsTeamIdentity {
  slug: string;
  name: string;
  abbreviation: string;
}

/** Canonical high-school teams keyed by alias slug. */
const HS_TEAM_ALIASES: Record<string, MaxprepsTeamIdentity> = {
  "montverde-academy-purple-eagles-ps": {
    slug: "montverde-academy-eagles-fl",
    name: "Montverde Academy Eagles",
    abbreviation: "MAE",
  },
  "montverde-academy-purple-eagles-fl": {
    slug: "montverde-academy-eagles-fl",
    name: "Montverde Academy Eagles",
    abbreviation: "MAE",
  },
  "montverde-fl": {
    slug: "montverde-academy-eagles-fl",
    name: "Montverde Academy Eagles",
    abbreviation: "MAE",
  },
  "montverde-fl-usa": {
    slug: "montverde-academy-eagles-fl",
    name: "Montverde Academy Eagles",
    abbreviation: "MAE",
  },
  "montverde-academy-hs-texas": {
    slug: "montverde-academy-eagles-fl",
    name: "Montverde Academy Eagles",
    abbreviation: "MAE",
  },
};

export const MONTEVERDE_HS_CANONICAL_SLUG = "montverde-academy-eagles-fl";

export const MONTEVERDE_HS_DUPLICATE_SLUGS = [
  "montverde-academy-purple-eagles-ps",
  "montverde-academy-purple-eagles-fl",
  "montverde-fl",
  "montverde-fl-usa",
  "montverde-academy-hs-texas",
] as const;

export function normalizeMaxprepsTeamForIngest(team: MaxprepsTeamIdentity): MaxprepsTeamIdentity {
  const slugKey = normalizeSlugParam(team.slug);
  const alias = HS_TEAM_ALIASES[slugKey];
  if (!alias) return team;
  return { ...alias };
}

/** Hide duplicate Montverde/Monteverde team pages outside the canonical MaxPreps HS slug. */
export function isHiddenMontverdeDuplicateSlug(slug: string): boolean {
  const normalized = normalizeSlugParam(slug);
  if (normalized === MONTEVERDE_HS_CANONICAL_SLUG) return false;
  return /\bmontverde\b|\bmonteverde\b/.test(normalized);
}
