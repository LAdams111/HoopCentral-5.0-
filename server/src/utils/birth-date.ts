/** Earliest plausible basketball birth year in our dataset. */
export const MIN_BIRTH_YEAR = 1880;

/**
 * Youngest age we accept for a stored/displayed birth date.
 * Scraped DOBs for toddlers / future years are almost always bad source data.
 */
export const MIN_PLAYER_AGE_YEARS = 13;

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function maxPlausibleBirthYear(asOf: Date = new Date()): number {
  return asOf.getFullYear() - MIN_PLAYER_AGE_YEARS;
}

export function minPlausibleBirthYear(): number {
  return MIN_BIRTH_YEAR;
}

/** Normalize to YYYY-MM-DD or null if missing/unparseable/implausible. */
export function sanitizeBirthDate(
  raw: string | null | undefined,
  asOf: Date = new Date(),
): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  const iso = trimmed.slice(0, 10);
  const match = ISO_DATE_RE.exec(iso);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  if (year < MIN_BIRTH_YEAR) return null;

  const cutoff = new Date(asOf);
  cutoff.setFullYear(cutoff.getFullYear() - MIN_PLAYER_AGE_YEARS);
  // Compare calendar date only (UTC noon avoids TZ edge cases).
  const birthUtc = Date.UTC(year, month - 1, day);
  const cutoffUtc = Date.UTC(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate());
  if (birthUtc > cutoffUtc) return null;

  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function isPlausibleBirthYear(year: number, asOf: Date = new Date()): boolean {
  return (
    Number.isInteger(year) &&
    year >= minPlausibleBirthYear() &&
    year <= maxPlausibleBirthYear(asOf)
  );
}
