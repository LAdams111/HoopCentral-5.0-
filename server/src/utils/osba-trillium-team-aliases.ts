import { normalizeSlugParam } from "./slug.js";

/**
 * Human-reviewed OSBA Trillium groups only. Never auto-detect duplicates.
 *
 * Include a group only when:
 * - OSBA renamed the same program across seasons (not parallel squads), and
 * - roster JSON shows zero overlapping seasons between alias and canonical slugs.
 *
 * Do NOT add: Brampton/C.O.D.E./CTA Red-Black/St Jude's Blue-White/Victory East-West/
 * Orangeville BDA vs Varsity — those are separate OSBA teams or squads.
 */
export interface OsbaTrilliumMergeGroup {
  id: string;
  canonicalSlug: string;
  aliasSlugs: readonly string[];
  reason: string;
}

export const OSBA_TRILLIUM_MERGE_GROUPS: readonly OsbaTrilliumMergeGroup[] = [
  {
    id: "king-heights-academy",
    canonicalSlug: "king-heights-academy-ca-on",
    aliasSlugs: ["king-heights-ca-on"],
    reason: "OSBA roster label King Heights (2023-24) → King Heights Academy (2025-26).",
  },
  {
    id: "full-circle-basketball-academy",
    canonicalSlug: "full-circle-basketball-academy-ca-on",
    aliasSlugs: ["full-circle-ca-on"],
    reason: "OSBA short label Full Circle (2023-24) → Full Circle Basketball Academy.",
  },
  {
    id: "father-henry-carr",
    canonicalSlug: "father-henry-carr-ca-on",
    aliasSlugs: ["fhc-prep-ca-on"],
    reason: "FHC Prep (2024-25) → Father Henry Carr (2025-26); same school program rename.",
  },
] as const;

const aliasToCanonical = new Map<string, string>();
const canonicalToVariants = new Map<string, Set<string>>();

for (const group of OSBA_TRILLIUM_MERGE_GROUPS) {
  const canonical = normalizeSlugParam(group.canonicalSlug);
  const variants = new Set<string>([canonical]);
  for (const alias of group.aliasSlugs) {
    const key = normalizeSlugParam(alias);
    aliasToCanonical.set(key, canonical);
    variants.add(key);
  }
  canonicalToVariants.set(canonical, variants);
}

export function resolveOsbaTrilliumCanonicalSlug(slug: string): string {
  const normalized = normalizeSlugParam(slug);
  return aliasToCanonical.get(normalized) ?? normalized;
}

export function resolveOsbaTrilliumSlugVariants(slug: string): string[] {
  const normalized = normalizeSlugParam(slug);
  const canonical = resolveOsbaTrilliumCanonicalSlug(normalized);
  const set = canonicalToVariants.get(canonical);
  if (!set) return [normalized];
  return [...set];
}

export function isHiddenOsbaTrilliumAliasSlug(slug: string): boolean {
  const normalized = normalizeSlugParam(slug);
  const canonical = aliasToCanonical.get(normalized);
  return Boolean(canonical && canonical !== normalized);
}

export function isOsbaTrilliumCanonicalSlug(slug: string): boolean {
  const normalized = normalizeSlugParam(slug);
  return canonicalToVariants.has(normalized);
}

export function listOsbaTrilliumAliasSlugs(): string[] {
  return [...aliasToCanonical.keys()];
}
