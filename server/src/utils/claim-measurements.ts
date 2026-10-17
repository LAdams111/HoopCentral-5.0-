import { formatPosition } from "./position.js";

const POSITIONS = new Set(["PG", "SG", "SF", "PF", "C", "G", "F"]);

export function parseHeightCm(value: string): number | null {
  const text = value.trim().toLowerCase();
  const feet = text.match(/(\d+)\s*'\s*(\d{1,2})/);
  if (feet) {
    const inches = Number(feet[1]) * 12 + Number(feet[2]);
    if (inches >= 48 && inches <= 96) return Math.round(inches * 2.54);
  }
  const cm = text.match(/(\d{3})\s*cm/);
  if (cm) {
    const n = Number(cm[1]);
    if (n >= 120 && n <= 250) return n;
  }
  return null;
}

export function parseWeightKg(value: string): number | null {
  const text = value.trim().toLowerCase();
  const match = text.match(/(\d{2,3})/);
  if (!match) return null;
  const n = Number(match[1]);
  if (text.includes("kg")) return n >= 40 && n <= 200 ? n : null;
  if (n >= 80 && n <= 450) return Math.round(n / 2.20462);
  return null;
}

export function parseClaimPosition(value: string): string | null {
  const formatted = formatPosition(value);
  const parts = formatted.split("/").filter(Boolean);
  if (parts.length === 0 || parts.length > 2) return null;
  if (!parts.every((part) => POSITIONS.has(part))) return null;
  return parts.join("/");
}

export function parseBirthDate(value: string): string | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1950 || year > 2025 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}
