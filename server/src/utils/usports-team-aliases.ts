import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeSlugParam } from "./slug.js";

export interface UsportsTeamIdentity {
  slug: string;
  name: string;
  abbreviation: string;
}

export interface UsportsTeamInventoryEntry {
  teamName: string;
  teamAbbreviation: string;
  slug: string;
  seasonMin?: string;
  seasonMax?: string;
  seasonCount?: number;
  playerSeasonRows?: number;
}

export interface UsportsTeamAliasReport {
  generatedAt: string;
  aliasMap: Record<string, string>;
  allTeams: UsportsTeamInventoryEntry[];
}

export interface UsportsTeamMergeGroup {
  canonicalSlug: string;
  slugVariants: string[];
  identity: UsportsTeamIdentity;
}

/** Teams that are not U Sports schools — hidden from the public league page. */
export const USPORTS_EXCLUDED_TEAM_SLUGS = new Set([
  "barako-bull",
  "belfast-star",
  "chicago-r",
  "chomutov",
  "hoops",
  "jamestown-j",
  "maine-rc",
  "peja",
  "reno-b",
]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPORT_PATH = path.resolve(__dirname, "../../data/usports-team-alias-report.json");

let cachedReport: UsportsTeamAliasReport | null = null;

export function getUsportsTeamAliasReportPath(): string {
  return process.env.USPORTS_TEAM_ALIAS_REPORT_PATH?.trim() || DEFAULT_REPORT_PATH;
}

export function loadUsportsTeamAliasReport(
  reportPath = getUsportsTeamAliasReportPath(),
): UsportsTeamAliasReport {
  if (cachedReport && reportPath === getUsportsTeamAliasReportPath()) {
    return cachedReport;
  }

  const raw = readFileSync(reportPath, "utf8");
  const parsed = JSON.parse(raw) as UsportsTeamAliasReport;
  if (reportPath === getUsportsTeamAliasReportPath()) {
    cachedReport = parsed;
  }
  return parsed;
}

function titleCaseName(name: string): string {
  return name
    .trim()
    .replace(/&quote;/g, "'")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function fallbackAbbreviation(teamName: string): string {
  const cleaned = teamName.replace(/&quote;/g, "'").trim();
  if (cleaned.length <= 6) return cleaned.toUpperCase();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 1) return cleaned.slice(0, 6).toUpperCase();
  return words
    .map((word) => word[0])
    .join("")
    .slice(0, 6)
    .toUpperCase();
}

function isAliasMapRoot(canonical: string, aliasMap: Record<string, string>): boolean {
  const normalized = normalizeSlugParam(canonical);
  return !aliasMap[normalized] || aliasMap[normalized] === normalized;
}

export function resolveCanonicalIdentity(
  canonicalSlug: string,
  report: UsportsTeamAliasReport = loadUsportsTeamAliasReport(),
): UsportsTeamIdentity {
  const canonical = normalizeSlugParam(canonicalSlug);
  const entry = report.allTeams.find((team) => normalizeSlugParam(team.slug) === canonical);
  if (entry) {
    return {
      slug: canonical,
      name: entry.teamName,
      abbreviation: entry.teamAbbreviation,
    };
  }

  const fallbackName = titleCaseName(canonical.replace(/-/g, " "));
  return {
    slug: canonical,
    name: fallbackName,
    abbreviation: fallbackAbbreviation(fallbackName),
  };
}

export function buildUsportsSlugToCanonicalMap(
  report: UsportsTeamAliasReport = loadUsportsTeamAliasReport(),
): Map<string, string> {
  const slugToCanonical = new Map<string, string>();

  for (const [aliasSlug, canonicalSlug] of Object.entries(report.aliasMap)) {
    const alias = normalizeSlugParam(aliasSlug);
    const canonical = normalizeSlugParam(canonicalSlug);
    if (!isAliasMapRoot(canonical, report.aliasMap)) continue;
    slugToCanonical.set(alias, canonical);
  }

  return slugToCanonical;
}

export function buildUsportsTeamMergeGroups(
  report: UsportsTeamAliasReport = loadUsportsTeamAliasReport(),
): UsportsTeamMergeGroup[] {
  const slugToCanonical = buildUsportsSlugToCanonicalMap(report);

  const grouped = new Map<string, Set<string>>();
  for (const [slug, canonical] of slugToCanonical) {
    const members = grouped.get(canonical) ?? new Set<string>();
    members.add(slug);
    members.add(canonical);
    grouped.set(canonical, members);
  }

  const mergeGroups: UsportsTeamMergeGroup[] = [];
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

export function normalizeUsportsTeamForIngest(
  team: UsportsTeamIdentity,
  report: UsportsTeamAliasReport = loadUsportsTeamAliasReport(),
): UsportsTeamIdentity {
  const slugKey = normalizeSlugParam(team.slug);
  const canonicalSlug = normalizeSlugParam(report.aliasMap[slugKey] ?? slugKey);

  if (USPORTS_EXCLUDED_TEAM_SLUGS.has(canonicalSlug) || USPORTS_EXCLUDED_TEAM_SLUGS.has(slugKey)) {
    throw new UsportsTeamRejectedError(team.name || slugKey);
  }

  const allowed = new Set(
    report.allTeams
      .map((entry) => normalizeSlugParam(entry.slug))
      .filter((slug) => !USPORTS_EXCLUDED_TEAM_SLUGS.has(slug)),
  );
  if (!allowed.has(canonicalSlug)) {
    throw new UsportsTeamRejectedError(team.name || slugKey);
  }

  if (canonicalSlug === slugKey) {
    return {
      slug: slugKey,
      name: titleCaseName(team.name),
      abbreviation: team.abbreviation || fallbackAbbreviation(team.name),
    };
  }

  return resolveCanonicalIdentity(canonicalSlug, report);
}

export class UsportsTeamRejectedError extends Error {
  constructor(teamLabel: string) {
    super(`Team is not a U Sports school: ${teamLabel}`);
    this.name = "UsportsTeamRejectedError";
  }
}

export function isUsportsTeamAllowed(
  team: UsportsTeamIdentity,
  report: UsportsTeamAliasReport = loadUsportsTeamAliasReport(),
): boolean {
  try {
    normalizeUsportsTeamForIngest(team, report);
    return true;
  } catch (error) {
    if (error instanceof UsportsTeamRejectedError) return false;
    throw error;
  }
}
