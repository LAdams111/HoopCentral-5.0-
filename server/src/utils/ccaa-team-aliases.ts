import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeSlugParam } from "./slug.js";

export interface CcaaTeamIdentity {
  slug: string;
  name: string;
  abbreviation: string;
}

export interface CcaaTeamMergeGroup {
  canonicalSlug: string;
  slugVariants: string[];
  identity: CcaaTeamIdentity;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANUAL_ALIASES_PATH = path.resolve(__dirname, "../../../scripts/ccaa-manual-aliases.json");

let cachedManualAliases: Record<string, string> | null = null;

export function getCcaaManualAliasesPath(): string {
  return process.env.CCAA_MANUAL_ALIASES_PATH?.trim() || MANUAL_ALIASES_PATH;
}

export function loadCcaaManualAliases(
  aliasesPath = getCcaaManualAliasesPath(),
): Record<string, string> {
  if (cachedManualAliases && aliasesPath === getCcaaManualAliasesPath()) {
    return cachedManualAliases;
  }

  const raw = readFileSync(aliasesPath, "utf8");
  const parsed = JSON.parse(raw) as Record<string, string>;
  const normalized: Record<string, string> = {};
  for (const [alias, canonical] of Object.entries(parsed)) {
    normalized[normalizeSlugParam(alias)] = normalizeSlugParam(canonical);
  }

  if (aliasesPath === getCcaaManualAliasesPath()) {
    cachedManualAliases = normalized;
  }

  return normalized;
}

export function buildCcaaSlugToCanonicalMap(
  aliasMap: Record<string, string> = loadCcaaManualAliases(),
): Map<string, string> {
  const slugToCanonical = new Map<string, string>();

  for (const [aliasSlug, canonicalSlug] of Object.entries(aliasMap)) {
    slugToCanonical.set(normalizeSlugParam(aliasSlug), normalizeSlugParam(canonicalSlug));
  }

  for (const canonicalSlug of new Set(slugToCanonical.values())) {
    slugToCanonical.set(canonicalSlug, canonicalSlug);
  }

  return slugToCanonical;
}

function titleCaseSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function resolveCcaaCanonicalIdentity(
  canonicalSlug: string,
  fallback?: Pick<CcaaTeamIdentity, "name" | "abbreviation">,
): CcaaTeamIdentity {
  const slug = normalizeSlugParam(canonicalSlug);
  return {
    slug,
    name: fallback?.name?.trim() || titleCaseSlug(slug),
    abbreviation: fallback?.abbreviation?.trim() || slug.toUpperCase(),
  };
}

export function buildCcaaTeamMergeGroups(
  aliasMap: Record<string, string> = loadCcaaManualAliases(),
): CcaaTeamMergeGroup[] {
  const slugToCanonical = buildCcaaSlugToCanonicalMap(aliasMap);
  const grouped = new Map<string, Set<string>>();

  for (const [slug, canonical] of slugToCanonical) {
    const members = grouped.get(canonical) ?? new Set<string>();
    members.add(slug);
    members.add(canonical);
    grouped.set(canonical, members);
  }

  const mergeGroups: CcaaTeamMergeGroup[] = [];
  for (const [canonicalSlug, slugVariants] of grouped) {
    if (slugVariants.size <= 1) continue;
    mergeGroups.push({
      canonicalSlug,
      slugVariants: [...slugVariants],
      identity: resolveCcaaCanonicalIdentity(canonicalSlug),
    });
  }

  return mergeGroups.sort((a, b) => a.identity.name.localeCompare(b.identity.name));
}

export function normalizeCcaaTeamForIngest(
  team: CcaaTeamIdentity,
  aliasMap: Record<string, string> = loadCcaaManualAliases(),
): CcaaTeamIdentity {
  const slugKey = normalizeSlugParam(team.slug);
  const canonicalSlug = normalizeSlugParam(aliasMap[slugKey] ?? slugKey);
  if (canonicalSlug === slugKey) return team;
  return {
    ...resolveCcaaCanonicalIdentity(canonicalSlug, team),
    slug: canonicalSlug,
  };
}

export function resolveCcaaTeamSlugVariants(
  slug: string,
  aliasMap: Record<string, string> = loadCcaaManualAliases(),
): string[] {
  const normalized = normalizeSlugParam(slug);
  const slugToCanonical = buildCcaaSlugToCanonicalMap(aliasMap);
  const canonical = slugToCanonical.get(normalized) ?? normalized;
  const variants = new Set<string>([normalized, canonical]);

  for (const [alias, target] of slugToCanonical) {
    if (target === canonical) variants.add(alias);
  }

  return [...variants];
}
