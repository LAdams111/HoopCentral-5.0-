/**
 * OTE stores minutes as a decimal (15.75). NBA game logs use a clock (15:45).
 * Leave clock times and whole minutes alone.
 */
export function formatGameLogMinutes(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+:\d{2}$/.test(trimmed)) return trimmed;
  if (!/^\d+\.\d+$/.test(trimmed)) return trimmed;

  const minutes = Number(trimmed);
  if (!Number.isFinite(minutes) || minutes < 0) return trimmed;

  const totalSeconds = Math.round(minutes * 60);
  const wholeMinutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(wholeMinutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
