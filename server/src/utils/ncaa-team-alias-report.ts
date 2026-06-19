import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeSlugParam } from "./slug.js";

export interface NcaaTeamIdentity {
  slug: string;
  name: string;
  abbreviation: string;
}

export interface NcaaTeamInventoryEntry {
  teamName: string;
  teamAbbreviation: string;
  slug: string;
  seasonMin: string;
  seasonMax: string;
  seasonCount: number;
  playerSeasonRows: number;
}

export interface NcaaSuspectedDuplicateVariant {
  teamName: string;
  slug: string;
  seasonMin: string;
  seasonMax: string;
  playerSeasonRows: number;
}

export interface NcaaSuspectedDuplicate {
  reason: "sequential_era_split" | "likely_same_school" | string;
  abbrev: string;
  variantA: NcaaSuspectedDuplicateVariant;
  variantB: NcaaSuspectedDuplicateVariant;
  suggestedCanonicalSlug: string;
}

export interface NcaaTeamAliasReport {
  generatedAt: string;
  aliasMap: Record<string, string>;
  suspectedDuplicates: NcaaSuspectedDuplicate[];
  allTeams: NcaaTeamInventoryEntry[];
}

export interface NcaaTeamMergeGroup {
  canonicalSlug: string;
  slugVariants: string[];
  identity: NcaaTeamIdentity;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPORT_PATH = path.resolve(__dirname, "../../data/ncaa-team-alias-report.json");
const MANUAL_ALIASES_PATH = path.resolve(__dirname, "../../../scripts/ncaa-manual-aliases.json");

let cachedReport: NcaaTeamAliasReport | null = null;
let cachedManualAliasSlugs: Map<string, Set<string>> | null = null;

export function getNcaaTeamAliasReportPath(): string {
  return process.env.NCAA_TEAM_ALIAS_REPORT_PATH?.trim() || DEFAULT_REPORT_PATH;
}

export function loadNcaaTeamAliasReport(reportPath = getNcaaTeamAliasReportPath()): NcaaTeamAliasReport {
  if (cachedReport && reportPath === getNcaaTeamAliasReportPath()) {
    return cachedReport;
  }

  const raw = readFileSync(reportPath, "utf8");
  const parsed = JSON.parse(raw) as NcaaTeamAliasReport;
  if (reportPath === getNcaaTeamAliasReportPath()) {
    cachedReport = parsed;
  }
  return parsed;
}

function normalizeTeamName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
}

function seasonStart(seasonLabel: string): number {
  return Number.parseInt(seasonLabel.split("-")[0] ?? "0", 10);
}

function seasonsDoNotOverlap(
  a: NcaaSuspectedDuplicateVariant,
  b: NcaaSuspectedDuplicateVariant,
): boolean {
  return (
    seasonStart(a.seasonMax) < seasonStart(b.seasonMin) ||
    seasonStart(b.seasonMax) < seasonStart(a.seasonMin)
  );
}

function sameSchoolName(nameA: string, nameB: string): boolean {
  const strip = (value: string) =>
    normalizeTeamName(value)
      .replace(/\b(st|state|univ|university)\b/g, "")
      .trim();

  const a = strip(nameA);
  const b = strip(nameB);
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;

  return a.split(" ").some((word) => word.length >= 4 && b.includes(word));
}

function isTrustedSuspectedDuplicate(
  pair: NcaaSuspectedDuplicate,
  aliasMap: Record<string, string>,
): boolean {
  if (pair.reason === "likely_same_school") return true;
  if (pair.reason !== "sequential_era_split") return false;

  const slugA = normalizeSlugParam(pair.variantA.slug);
  const slugB = normalizeSlugParam(pair.variantB.slug);
  const canonical = normalizeSlugParam(pair.suggestedCanonicalSlug);

  if (aliasMap[slugA] === slugB || aliasMap[slugB] === slugA) return true;
  if (aliasMap[slugA] === canonical || aliasMap[slugB] === canonical) return true;

  if (
    sameSchoolName(pair.variantA.teamName, pair.variantB.teamName) &&
    seasonsDoNotOverlap(pair.variantA, pair.variantB)
  ) {
    return true;
  }

  return false;
}

function buildInventoryBySlug(
  allTeams: NcaaTeamInventoryEntry[],
): Map<string, NcaaTeamInventoryEntry> {
  const bySlug = new Map<string, NcaaTeamInventoryEntry>();
  for (const team of allTeams) {
    bySlug.set(normalizeSlugParam(team.slug), team);
  }
  return bySlug;
}

function buildAliasesByCanonical(aliasMap: Record<string, string>): Map<string, Set<string>> {
  const groups = new Map<string, Set<string>>();

  for (const [aliasSlug, canonicalSlug] of Object.entries(aliasMap)) {
    const alias = normalizeSlugParam(aliasSlug);
    const canonical = normalizeSlugParam(canonicalSlug);
    const members = groups.get(canonical) ?? new Set<string>();
    members.add(alias);
    members.add(canonical);
    groups.set(canonical, members);
  }

  return groups;
}

function pickInventoryEntry(
  slugVariants: Set<string>,
  inventoryBySlug: Map<string, NcaaTeamInventoryEntry>,
): NcaaTeamInventoryEntry | null {
  let best: NcaaTeamInventoryEntry | null = null;
  for (const slug of slugVariants) {
    const entry = inventoryBySlug.get(slug);
    if (!entry) continue;
    if (!best || entry.playerSeasonRows > best.playerSeasonRows) {
      best = entry;
    }
  }
  return best;
}

export function resolveCanonicalIdentity(
  canonicalSlug: string,
  report: NcaaTeamAliasReport = loadNcaaTeamAliasReport(),
): NcaaTeamIdentity {
  const canonical = normalizeSlugParam(canonicalSlug);
  const inventoryBySlug = buildInventoryBySlug(report.allTeams);
  const aliasesByCanonical = buildAliasesByCanonical(report.aliasMap);
  const slugVariants = aliasesByCanonical.get(canonical) ?? new Set([canonical]);

  const direct = inventoryBySlug.get(canonical);
  if (direct) {
    return {
      slug: canonical,
      name: direct.teamName,
      abbreviation: direct.teamAbbreviation,
    };
  }

  const best = pickInventoryEntry(slugVariants, inventoryBySlug);
  if (best) {
    return {
      slug: canonical,
      name: best.teamName,
      abbreviation: best.teamAbbreviation,
    };
  }

  return {
    slug: canonical,
    name: canonical,
    abbreviation: canonical.toUpperCase(),
  };
}

function inventoryBySlug(
  report: NcaaTeamAliasReport,
): Map<string, NcaaTeamInventoryEntry> {
  return buildInventoryBySlug(report.allTeams);
}

function isAliasMapRoot(canonicalSlug: string, aliasMap: Record<string, string>): boolean {
  const canonical = normalizeSlugParam(canonicalSlug);
  const mapped = aliasMap[canonical];
  return !mapped || normalizeSlugParam(mapped) === canonical;
}

function isAbbrevStyleSlug(slug: string): boolean {
  const normalized = normalizeSlugParam(slug);
  return normalized.length <= 4 && !normalized.includes("-");
}

function aliasesShareIdentity(
  slugs: string[],
  inventory: Map<string, NcaaTeamInventoryEntry>,
  aliasMap: Record<string, string>,
  canonicalSlug: string,
): boolean {
  const normalized = slugs.map(normalizeSlugParam);
  const canonical = normalizeSlugParam(canonicalSlug);
  const sorted = [...normalized].sort((a, b) => b.length - a.length);
  const root = sorted[0] ?? "";
  if (
    sorted.length > 1 &&
    sorted.slice(1).every((slug) => root.startsWith(slug) || slug.startsWith(root))
  ) {
    return true;
  }

  const nonCanonical = normalized.filter((slug) => slug !== canonical);
  if (
    nonCanonical.length > 0 &&
    nonCanonical.every(
      (slug) => isAbbrevStyleSlug(slug) && aliasMap[slug] === canonical,
    )
  ) {
    return true;
  }

  const entries = normalized
    .map((slug) => inventory.get(slug))
    .filter((entry): entry is NcaaTeamInventoryEntry => entry != null);

  if (entries.length <= 1) return entries.length === slugs.length;

  const abbrev = entries[0]?.teamAbbreviation;
  if (
    abbrev &&
    abbrev.length >= 3 &&
    entries.every((entry) => entry.teamAbbreviation === abbrev)
  ) {
    return true;
  }

  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      if (sameSchoolName(entries[i].teamName, entries[j].teamName)) {
        return true;
      }
    }
  }

  return false;
}

export function buildNcaaSlugToCanonicalMap(
  report: NcaaTeamAliasReport = loadNcaaTeamAliasReport(),
): Map<string, string> {
  const slugToCanonical = new Map<string, string>();
  const inventory = inventoryBySlug(report);

  const assign = (slug: string, canonicalSlug: string): void => {
    slugToCanonical.set(normalizeSlugParam(slug), normalizeSlugParam(canonicalSlug));
  };

  for (const pair of report.suspectedDuplicates) {
    if (pair.reason !== "likely_same_school") continue;
    if (!isTrustedSuspectedDuplicate(pair, report.aliasMap)) continue;
    assign(pair.variantA.slug, pair.suggestedCanonicalSlug);
    assign(pair.variantB.slug, pair.suggestedCanonicalSlug);
  }

  for (const pair of report.suspectedDuplicates) {
    if (pair.reason !== "sequential_era_split") continue;
    if (!isTrustedSuspectedDuplicate(pair, report.aliasMap)) continue;
    if (!sameSchoolName(pair.variantA.teamName, pair.variantB.teamName)) continue;
    assign(pair.variantA.slug, pair.suggestedCanonicalSlug);
    assign(pair.variantB.slug, pair.suggestedCanonicalSlug);
  }

  const aliasGroups = new Map<string, Set<string>>();
  for (const [aliasSlug, canonicalSlug] of Object.entries(report.aliasMap)) {
    const alias = normalizeSlugParam(aliasSlug);
    const canonical = normalizeSlugParam(canonicalSlug);
    if (!isAliasMapRoot(canonical, report.aliasMap)) continue;
    const members = aliasGroups.get(canonical) ?? new Set<string>();
    members.add(alias);
    members.add(canonical);
    aliasGroups.set(canonical, members);
  }

  for (const [canonical, members] of aliasGroups) {
    const slugList = [...members];
    const unassigned = slugList.filter((slug) => !slugToCanonical.has(slug));
    if (unassigned.length <= 1) continue;
    if (!aliasesShareIdentity(slugList, inventory, report.aliasMap, canonical)) continue;
    for (const slug of slugList) {
      if (!slugToCanonical.has(slug)) {
        assign(slug, canonical);
      }
    }
  }

  return slugToCanonical;
}

/** Slug redirects for ingest: trusted pairs plus direct root aliasMap entries. */
export function buildNcaaIngestSlugToCanonicalMap(
  report: NcaaTeamAliasReport = loadNcaaTeamAliasReport(),
): Map<string, string> {
  const slugToCanonical = buildNcaaSlugToCanonicalMap(report);

  for (const [aliasSlug, canonicalSlug] of Object.entries(report.aliasMap)) {
    const alias = normalizeSlugParam(aliasSlug);
    const canonical = normalizeSlugParam(canonicalSlug);
    if (!isAliasMapRoot(canonical, report.aliasMap)) continue;
    if (slugToCanonical.has(alias)) continue;
    slugToCanonical.set(alias, canonical);
  }

  return slugToCanonical;
}


export function buildNcaaTeamMergeGroups(
  report: NcaaTeamAliasReport = loadNcaaTeamAliasReport(),
): NcaaTeamMergeGroup[] {
  const slugToCanonical = buildNcaaSlugToCanonicalMap(report);

  const grouped = new Map<string, Set<string>>();
  for (const [slug, canonical] of slugToCanonical) {
    const members = grouped.get(canonical) ?? new Set<string>();
    members.add(slug);
    members.add(canonical);
    grouped.set(canonical, members);
  }

  const mergeGroups: NcaaTeamMergeGroup[] = [];
  for (const [canonicalSlug, slugVariants] of grouped) {
    if (slugVariants.size <= 1) continue;

    mergeGroups.push({
      canonicalSlug,
      slugVariants: [...slugVariants],
      identity: resolveCanonicalIdentity(canonicalSlug, report),
    });
  }

  return mergeGroups.sort((a, b) => a.identity.name.localeCompare(b.identity.name));
}

export function buildNcaaSlugRedirectMap(
  report: NcaaTeamAliasReport = loadNcaaTeamAliasReport(),
): Map<string, string> {
  return buildNcaaSlugToCanonicalMap(report);
}

/** Trusted USBasket ↔ ESPN slug groups (manual list only — not the full aliasMap). */
function loadTrustedManualAliasGroups(): Map<string, Set<string>> {
  if (cachedManualAliasSlugs) return cachedManualAliasSlugs;

  const raw = readFileSync(MANUAL_ALIASES_PATH, "utf8") as string;
  const manual = JSON.parse(raw) as Record<string, string>;
  const groups = new Map<string, Set<string>>();

  const addPair = (aliasSlug: string, canonicalSlug: string): void => {
    const alias = normalizeSlugParam(aliasSlug);
    const canonical = normalizeSlugParam(canonicalSlug);
    if (!alias || !canonical) return;

    const key = [alias, canonical].sort().join("|");
    const members = groups.get(key) ?? new Set<string>();
    members.add(alias);
    members.add(canonical);
    groups.set(key, members);
  };

  for (const [alias, canonical] of Object.entries(manual)) {
    addPair(alias, canonical);
  }

  cachedManualAliasSlugs = groups;
  return groups;
}

/** All slug variants for one NCAA school (trusted alias groups only). */
export function resolveNcaaTeamSlugVariants(
  slug: string,
): string[] {
  const normalized = normalizeSlugParam(slug);
  const variants = new Set<string>([normalized]);

  for (const members of loadTrustedManualAliasGroups().values()) {
    if (members.has(normalized)) {
      for (const member of members) {
        variants.add(member);
      }
    }
  }

  return [...variants];
}

/** Resolve usbasket team payload fields using aliasMap + allTeams inventory. */
export function normalizeNcaaTeamForIngest(
  team: NcaaTeamIdentity,
  report: NcaaTeamAliasReport = loadNcaaTeamAliasReport(),
): NcaaTeamIdentity {
  const slugKey = normalizeSlugParam(team.slug);
  const redirects = buildNcaaIngestSlugToCanonicalMap(report);
  const canonicalSlug = redirects.get(slugKey);

  if (!canonicalSlug || canonicalSlug === slugKey) {
    return team;
  }

  return resolveCanonicalIdentity(canonicalSlug, report);
}
