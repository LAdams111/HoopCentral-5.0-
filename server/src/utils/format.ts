export function cmToFeetInches(cm: number | null | undefined): string {
  if (!cm) return "—";
  const totalInches = Math.round(cm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}'${inches}"`;
}

export function kgToLbs(kg: number | null | undefined): string {
  if (!kg) return "—";
  return `${Math.round(kg * 2.20462)} lbs`;
}

export function formatStat(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return String(value);
}
