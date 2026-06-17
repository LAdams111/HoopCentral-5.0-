const POSITION_ALIASES: Record<string, string> = {
  "point guard": "PG",
  "shooting guard": "SG",
  "small forward": "SF",
  "power forward": "PF",
  center: "C",
  guard: "G",
  forward: "F",
  pg: "PG",
  sg: "SG",
  sf: "SF",
  pf: "PF",
  c: "C",
  g: "G",
  f: "F",
};

function abbreviatePositionToken(token: string): string | null {
  const trimmed = token.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  const alias = POSITION_ALIASES[lower];
  if (alias) return alias;

  if (/^[a-z]{1,2}$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  if (trimmed.includes("-")) {
    const parts = trimmed
      .split("-")
      .map(abbreviatePositionToken)
      .filter((part): part is string => Boolean(part));
    return parts.length > 0 ? parts.join("/") : null;
  }

  return trimmed.toUpperCase();
}

function splitPositionParts(position: string): string[] {
  return position
    .replace(/\s+and\s+/gi, ",")
    .replace(/\//g, ",")
    .split(",")
    .flatMap((part) => {
      const trimmed = part.trim();
      if (!trimmed) return [];

      if (
        trimmed.includes("-") &&
        !/\b(point|shooting|small|power)\b/i.test(trimmed)
      ) {
        return trimmed.split("-");
      }

      return [trimmed];
    });
}

export function formatPosition(position: string | null | undefined): string {
  if (!position?.trim()) return "";

  const parts = splitPositionParts(position)
    .flatMap((part) => {
      const abbreviated = abbreviatePositionToken(part);
      if (!abbreviated) return [];
      return abbreviated.split("/");
    })
    .filter(Boolean);

  const unique: string[] = [];
  for (const part of parts) {
    if (!unique.includes(part)) unique.push(part);
  }

  return unique.join("/");
}

export function formatPositionLabel(position: string | null | undefined): string {
  const formatted = formatPosition(position);
  return formatted || "PLAYER";
}
