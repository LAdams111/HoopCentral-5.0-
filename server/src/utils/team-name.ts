import { isJunkTeamName, isJunkTeamSlug } from "./league-visibility.js";

/**
 * Strip scraper junk that sometimes gets glued onto team names.
 * Keeps intentional brands like "New Jersey Starting 5ive".
 */
export function sanitizeTeamDisplayName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  if (/starting\s*5ive/i.test(trimmed)) return trimmed;

  let cleaned = trimmed
    .replace(/\s*[,|:;-]?\s*starting\s*five\s*$/i, "")
    .replace(/\s*[,|:;-]?\s*starting\s*5\s*$/i, "")
    .trim();

  // Reverse letter-i corruption: "Resov, starting fivea" → "Resovia"
  if (/,\s*starting five/i.test(cleaned)) {
    cleaned = cleaned.replace(/,\s*starting five/gi, "i").trim();
  }

  return cleaned.replace(/\s{2,}/g, " ").replace(/[,\s-]+$/g, "").trim() || trimmed;
}

/**
 * True when the name/slug is a bio sentence or other narrative junk, not a real club.
 * Used by ingest to refuse creating teams like
 * "AT THE BEGINNING OF THE SEASON PLAYED SHORTLY AT … THEN JOINED …".
 */
export function isNarrativeJunkTeamName(name: string, slug?: string): boolean {
  if (isJunkTeamName(name)) return true;
  if (slug && isJunkTeamSlug(slug)) return true;
  return false;
}
