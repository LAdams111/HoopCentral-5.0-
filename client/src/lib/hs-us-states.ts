/** US states + DC for MaxPreps high-school team slug suffixes (e.g. `…-knights-al`). */
export const US_STATE_CODE_TO_NAME: Record<string, string> = {
  al: "Alabama",
  ak: "Alaska",
  az: "Arizona",
  ar: "Arkansas",
  ca: "California",
  co: "Colorado",
  ct: "Connecticut",
  de: "Delaware",
  dc: "District of Columbia",
  fl: "Florida",
  ga: "Georgia",
  hi: "Hawaii",
  id: "Idaho",
  il: "Illinois",
  in: "Indiana",
  ia: "Iowa",
  ks: "Kansas",
  ky: "Kentucky",
  la: "Louisiana",
  me: "Maine",
  md: "Maryland",
  ma: "Massachusetts",
  mi: "Michigan",
  mn: "Minnesota",
  ms: "Mississippi",
  mo: "Missouri",
  mt: "Montana",
  ne: "Nebraska",
  nv: "Nevada",
  nh: "New Hampshire",
  nj: "New Jersey",
  nm: "New Mexico",
  ny: "New York",
  nc: "North Carolina",
  nd: "North Dakota",
  oh: "Ohio",
  ok: "Oklahoma",
  or: "Oregon",
  pa: "Pennsylvania",
  ri: "Rhode Island",
  sc: "South Carolina",
  sd: "South Dakota",
  tn: "Tennessee",
  tx: "Texas",
  ut: "Utah",
  vt: "Vermont",
  va: "Virginia",
  wa: "Washington",
  wv: "West Virginia",
  wi: "Wisconsin",
  wy: "Wyoming",
};

export const HS_OTHER_STATE_SLUG = "other";
export const HS_USA_REGION_SLUG = "usa";

const US_STATE_CODES = new Set(Object.keys(US_STATE_CODE_TO_NAME));

function slugifyStateName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const STATE_CODE_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(US_STATE_CODE_TO_NAME).map(([code, name]) => [code, slugifyStateName(name)]),
);

const STATE_SLUG_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_CODE_TO_SLUG).map(([code, slug]) => [slug, code]),
);

/** Parse two-letter US state from a MaxPreps team slug suffix. */
export function parseUsStateCodeFromTeamSlug(slug: string): string | null {
  const trimmed = slug.trim().toLowerCase();
  if (!trimmed) return null;
  const parts = trimmed.split("-").filter(Boolean);
  const last = parts[parts.length - 1];
  if (!last || last.length !== 2) return null;
  return US_STATE_CODES.has(last) ? last : null;
}

export function stateSlugFromTeamSlug(teamSlug: string): string {
  const code = parseUsStateCodeFromTeamSlug(teamSlug);
  if (!code) return HS_OTHER_STATE_SLUG;
  return STATE_CODE_TO_SLUG[code] ?? HS_OTHER_STATE_SLUG;
}

export function stateNameFromSlug(stateSlug: string): string {
  if (stateSlug === HS_OTHER_STATE_SLUG) return "Other";
  const code = STATE_SLUG_TO_CODE[stateSlug];
  if (!code) return "Other";
  return US_STATE_CODE_TO_NAME[code] ?? "Other";
}

export function isKnownHsStateSlug(stateSlug: string): boolean {
  return stateSlug === HS_OTHER_STATE_SLUG || stateSlug in STATE_SLUG_TO_CODE;
}

export function allHsStateSlugs(): string[] {
  const slugs = Object.values(STATE_CODE_TO_SLUG).sort((a, b) =>
    stateNameFromSlug(a).localeCompare(stateNameFromSlug(b)),
  );
  slugs.push(HS_OTHER_STATE_SLUG);
  return slugs;
}
