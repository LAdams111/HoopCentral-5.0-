import { sanitizeBirthDate } from "./birth-date.js";

/** Typical US HS graduation year from date of birth (turn ~18 senior spring). */
export function inferHsClassOfFromBirthDate(
  birthDate: string | null | undefined,
): number | null {
  const iso = sanitizeBirthDate(birthDate);
  if (!iso) return null;
  const birthYear = Number(iso.slice(0, 4));
  if (!Number.isInteger(birthYear)) return null;
  const classOf = birthYear + 19;
  if (classOf < 1950 || classOf > 2040) return null;
  return classOf;
}

export function isPlausibleHsClassOf(year: number): boolean {
  return Number.isInteger(year) && year >= 1950 && year <= 2040;
}
