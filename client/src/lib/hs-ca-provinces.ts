/** Canadian provinces/territories for high-school team slug suffixes (e.g. `…-ca-on`). */
export const CA_PROVINCE_CODE_TO_NAME: Record<string, string> = {
  on: "Ontario",
  bc: "British Columbia",
  ab: "Alberta",
  sk: "Saskatchewan",
  mb: "Manitoba",
  qc: "Quebec",
  nb: "New Brunswick",
  ns: "Nova Scotia",
  pe: "Prince Edward Island",
  nl: "Newfoundland and Labrador",
  yt: "Yukon",
  nt: "Northwest Territories",
  nu: "Nunavut",
};

export const HS_CANADA_REGION_SLUG = "canada";
export const HS_CA_PROVINCE_SUFFIX = "ca";

const CA_PROVINCE_CODES = new Set(Object.keys(CA_PROVINCE_CODE_TO_NAME));

function slugifyProvinceName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const PROVINCE_CODE_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(CA_PROVINCE_CODE_TO_NAME).map(([code, name]) => [code, slugifyProvinceName(name)]),
);

const PROVINCE_SLUG_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(PROVINCE_CODE_TO_SLUG).map(([code, slug]) => [slug, code]),
);

/** Parse `-ca-xx` suffix from a Canadian high-school team slug. */
export function parseCaProvinceCodeFromTeamSlug(slug: string): string | null {
  const trimmed = slug.trim().toLowerCase();
  const match = /-ca-([a-z]{2})$/.exec(trimmed);
  if (!match) return null;
  const code = match[1];
  return CA_PROVINCE_CODES.has(code) ? code : null;
}

export function provinceSlugFromTeamSlug(teamSlug: string): string | null {
  const code = parseCaProvinceCodeFromTeamSlug(teamSlug);
  if (!code) return null;
  return PROVINCE_CODE_TO_SLUG[code] ?? null;
}

export function provinceNameFromSlug(provinceSlug: string): string {
  const code = PROVINCE_SLUG_TO_CODE[provinceSlug.trim().toLowerCase()];
  if (!code) return provinceSlug;
  return CA_PROVINCE_CODE_TO_NAME[code] ?? provinceSlug;
}

export function isKnownHsProvinceSlug(provinceSlug: string): boolean {
  return provinceSlug.trim().toLowerCase() in PROVINCE_SLUG_TO_CODE;
}

export function allHsProvinceSlugs(): string[] {
  return Object.values(PROVINCE_CODE_TO_SLUG).sort((a, b) =>
    provinceNameFromSlug(a).localeCompare(provinceNameFromSlug(b)),
  );
}

export function isCanadianHsTeamSlug(teamSlug: string): boolean {
  return parseCaProvinceCodeFromTeamSlug(teamSlug) != null;
}
