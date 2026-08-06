import { normalizeSlugParam } from "./slug.js";

const MASCOT_MODIFIERS = new Set([
  "purple",
  "blue",
  "gold",
  "black",
  "white",
  "red",
  "national",
  "open",
  "select",
  "prep",
]);

function titleCaseWord(word: string): string {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function teamBasePathFromAthleteUrl(url: string): string | null {
  try {
    const match = url.trim().match(/maxpreps\.com(\/[a-z]{2}\/[^/]+\/[^/]+)\/athletes\//i);
    if (!match?.[1]) return null;
    return `${match[1]}/basketball`.toLowerCase();
  } catch {
    return null;
  }
}

export function stateCodeFromTeamBasePath(teamBasePath: string): string | null {
  const parts = teamBasePath.split("/").filter(Boolean);
  const state = parts[0];
  return state && state.length === 2 ? state : null;
}

export function mascotFromSchoolSlug(schoolSlug: string): string {
  const parts = schoolSlug.split("-").filter(Boolean);
  if (parts.length === 0) return "";
  const last = parts[parts.length - 1] ?? "";
  const prev = parts.length >= 2 ? (parts[parts.length - 2] ?? "") : "";
  if (prev && MASCOT_MODIFIERS.has(prev)) {
    return `${titleCaseWord(prev)} ${titleCaseWord(last)}`;
  }
  return titleCaseWord(last);
}

/** School name from slug without mascot suffix (montverde-academy-purple-eagles → Montverde Academy). */
export function schoolNameFromSchoolSlug(schoolSlug: string): string {
  const parts = schoolSlug.split("-").filter(Boolean);
  if (parts.length === 0) return "";
  const prev = parts.length >= 2 ? (parts[parts.length - 2] ?? "") : "";
  const schoolParts =
    prev && MASCOT_MODIFIERS.has(prev) ? parts.slice(0, -2) : parts.slice(0, -1);
  return schoolParts.map(titleCaseWord).join(" ");
}

export function teamSlugFromPath(teamBasePath: string, stateCode: string): string {
  const parts = teamBasePath.split("/").filter(Boolean);
  const schoolSlug = parts[2] ?? parts[parts.length - 2] ?? "team";
  const state = stateCode.trim().toLowerCase();
  return `${schoolSlug}-${state}`;
}

export function hsTeamSlugFromPath(teamBasePath: string, stateCode: string): string {
  const state = stateCodeFromTeamBasePath(teamBasePath) ?? stateCode.trim().toLowerCase();
  return teamSlugFromPath(teamBasePath, state);
}

export function schoolLabelFromCsvName(raw: string, city: string, state: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return city.trim() || state.toUpperCase();
  const withoutLocation = trimmed.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return withoutLocation || trimmed;
}

export function maxprepsTeamDisplayName(input: {
  schoolName: string;
  mascot: string;
  level?: string;
  gender?: string;
}): string {
  const school = input.schoolName.trim();
  const parts = [school];
  if (input.mascot.trim()) parts.push(input.mascot.trim());
  parts.push(input.level?.trim() || "Varsity");
  parts.push(input.gender?.trim() || "Boys", "Basketball");
  return parts.join(" ");
}

export function fallbackAbbreviation(teamName: string): string {
  const words = teamName.replace(/[^a-zA-Z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "TM";
  if (words.length === 1) return words[0]!.slice(0, 3).toUpperCase();
  return words
    .slice(0, 4)
    .map((w) => w[0]!)
    .join("")
    .toUpperCase();
}

export interface MaxprepsCsvTeamRow {
  athleteUrl: string;
  schoolName: string;
  schoolCity: string;
  state: string;
  schoolState: string;
}

export function teamIdentityFromCsvRow(row: MaxprepsCsvTeamRow): {
  teamSlug: string;
  teamName: string;
  abbreviation: string;
} | null {
  const teamBasePath = teamBasePathFromAthleteUrl(row.athleteUrl);
  if (!teamBasePath) return null;
  const stateCode =
    stateCodeFromTeamBasePath(teamBasePath) ??
    (row.state.trim().toLowerCase() || row.schoolState.trim().toLowerCase());
  if (!stateCode) return null;

  const slugParts = teamBasePath.split("/").filter(Boolean);
  const schoolSlug = slugParts[2] ?? "team";
  const mascot = mascotFromSchoolSlug(schoolSlug);
  const schoolLabel =
    schoolNameFromSchoolSlug(schoolSlug) ||
    schoolLabelFromCsvName(row.schoolName, row.schoolCity, stateCode);
  const teamName = maxprepsTeamDisplayName({
    schoolName: schoolLabel,
    mascot,
    level: "Varsity",
    gender: "Boys",
  });

  return {
    teamSlug: normalizeSlugParam(hsTeamSlugFromPath(teamBasePath, stateCode)),
    teamName,
    abbreviation: fallbackAbbreviation(teamName),
  };
}

/** MaxPreps season slug → label (24-25 → 2024-25). */
export function maxprepsSeasonToLabel(seasonSlug: string): string | null {
  const match = /^(\d{2})-(\d{2})$/.exec(seasonSlug.trim());
  if (!match) return null;
  const start = Number.parseInt(match[1]!, 10);
  const end = Number.parseInt(match[2]!, 10);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  const century = start >= 50 ? 1900 : 2000;
  return `${century + start}-${String(end).padStart(2, "0")}`;
}
