/** MaxPreps CSV stores jerseys as floats ("20.0") — normalize for API display. */
export function formatJerseyNumber(raw: string | null | undefined): string {
  const trimmed = raw?.trim();
  if (!trimmed) return "";
  if (/^\d+\.0+$/.test(trimmed)) {
    return String(Number.parseInt(trimmed, 10));
  }
  return trimmed;
}
