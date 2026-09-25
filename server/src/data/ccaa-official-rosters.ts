import { resolveCcaaOfficialSlug } from "./ccaa-teams.js";
import { CCAA_OFFICIAL_ROSTER_NAMES } from "./ccaa-official-roster-names.js";

export function normalizeCcaaRosterName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[''`´‘’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function ccaaRosterNameKeys(name: string): string[] {
  const normalized = normalizeCcaaRosterName(name);
  if (!normalized) return [];
  const parts = normalized.split(" ").filter(Boolean);
  const keys = [normalized];
  if (parts.length >= 2) {
    keys.push(`${parts[parts.length - 1]} ${parts.slice(0, -1).join(" ")}`);
  }
  return [...new Set(keys)];
}

const namesCache = new Map<string, readonly string[]>();

function uniqueOfficialNames(names: readonly string[]): string[] {
  const sorted = [...names].sort((a, b) => b.trim().length - a.trim().length);
  const kept: string[] = [];
  const seen = new Set<string>();

  for (const name of sorted) {
    const keys = ccaaRosterNameKeys(name);
    const parts = normalizeCcaaRosterName(name).split(" ").filter(Boolean);
    if (keys.some((key) => seen.has(key))) continue;
    if (parts.length === 1 && seen.has(parts[0]!)) continue;

    for (const key of keys) seen.add(key);
    if (parts.length > 1) seen.add(parts[parts.length - 1]!);
    kept.push(name);
  }

  return kept.sort((a, b) => a.localeCompare(b));
}

export function getCcaaOfficialRosterNames(
  teamSlug: string,
  seasonLabel: string,
): readonly string[] | null {
  const officialSlug = resolveCcaaOfficialSlug(teamSlug);
  if (!officialSlug) return null;

  const key = `${seasonLabel}:${officialSlug}`;
  const cached = namesCache.get(key);
  if (cached) return cached.length > 0 ? cached : null;

  const names = uniqueOfficialNames(CCAA_OFFICIAL_ROSTER_NAMES[seasonLabel]?.[officialSlug] ?? []);
  namesCache.set(key, names);
  return names.length > 0 ? names : null;
}

export function getCcaaOfficialRosterNameSet(
  teamSlug: string,
  seasonLabel: string,
): Set<string> | null {
  const names = getCcaaOfficialRosterNames(teamSlug, seasonLabel);
  if (!names) return null;
  return new Set(names.flatMap(ccaaRosterNameKeys));
}

export function matchCcaaOfficialRosterName(
  playerName: string,
  officialNames: readonly string[],
  isOfficial = false,
): string | null {
  const playerKeys = ccaaRosterNameKeys(playerName);
  for (const officialName of officialNames) {
    const officialKeys = ccaaRosterNameKeys(officialName);
    if (playerKeys.some((key) => officialKeys.includes(key))) return officialName;
  }

  if (!isOfficial) return null;
  const parts = normalizeCcaaRosterName(playerName).split(" ").filter(Boolean);
  const last = parts[parts.length - 1];
  if (!last) return null;
  return (
    officialNames.find((officialName) => {
      const officialParts = normalizeCcaaRosterName(officialName).split(" ").filter(Boolean);
      return officialParts.length === 1 && officialParts[0] === last;
    }) ?? null
  );
}

export function pickCcaaOfficialRosterEntries<T>(
  entries: T[],
  teamSlug: string,
  seasonLabel: string,
  nameOf: (entry: T) => string,
  isOfficial: (entry: T) => boolean = () => false,
): T[] {
  const officialNames = getCcaaOfficialRosterNames(teamSlug, seasonLabel);
  if (!officialNames) return entries;

  const best = new Map<string, T>();
  for (const entry of entries) {
    const officialName = matchCcaaOfficialRosterName(
      nameOf(entry),
      officialNames,
      isOfficial(entry),
    );
    if (!officialName) continue;
    const key = normalizeCcaaRosterName(officialName);
    const existing = best.get(key);
    if (!existing || (isOfficial(entry) && !isOfficial(existing))) {
      best.set(key, entry);
    }
  }
  return [...best.values()];
}

export function filterCcaaOfficialRoster<T extends { name: string; official?: boolean }>(
  players: T[],
  teamSlug: string,
  seasonLabel: string,
): T[] {
  return pickCcaaOfficialRosterEntries(
    players,
    teamSlug,
    seasonLabel,
    (player) => player.name,
    (player) => Boolean(player.official),
  );
}
