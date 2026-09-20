/**
 * Official-style display names for OSBA Trillium teams (slug → full school/program name).
 * Prevents abbreviated roster labels (CTA, FHC Prep, BDA, etc.) from sticking in Hoop Central.
 */
export const CANONICAL_TEAM_NAME_BY_SLUG = {
  "ace-acumen-heights-ca-on": "Ace Acumen Heights",
  "bond-academy-ca-on": "Bond Academy",
  "brampton-city-prep-ca-on": "Brampton City Prep",
  "brampton-city-prep-nationals-ca-on": "Brampton City Prep Nationals",
  "brampton-city-prep-provincial-ca-on": "Brampton City Prep Provincial",
  "brampton-city-prep-provincials-ca-on": "Brampton City Prep Provincial",
  "brampton-city-prep-regional-ca-on": "Brampton City Prep Regional",
  "c-o-d-e-academy-ca-on": "C.O.D.E. Academy",
  "c-o-d-e-international-ca-on": "C.O.D.E. International",
  "c-o-d-e-national-ca-on": "C.O.D.E. National",
  "c-o-d-e-provincial-ca-on": "C.O.D.E. Provincial",
  "canada-topflight-academy-black-ca-on": "Canada Topflight Academy Black",
  "canada-topflight-academy-red-ca-on": "Canada Topflight Academy Red",
  /** 2023-24 roster table abbreviation for Canada Topflight Academy */
  "cta-ca-on": "Canada Topflight Academy",
  "excel-hoops-prep-ca-on": "Excel Hoops Prep",
  "father-henry-carr-ca-on": "Father Henry Carr",
  "fhc-prep-ca-on": "Father Henry Carr Prep",
  "full-circle-basketball-academy-ca-on": "Full Circle Basketball Academy",
  "full-circle-ca-on": "Full Circle Basketball Academy",
  "future-hope-academy-ca-on": "Future Hope Academy",
  "h5-academy-ca-on": "H5 Academy",
  "hodan-nighthawks-ca-on": "Hodan Nighthawks",
  "inspire-academy-ca-on": "Inspire Academy",
  "j-addison-school-ca-on": "J. Addison School",
  "james-cardinal-mcguigan-ca-on": "James Cardinal McGuigan",
  "kennedy-prep-ca-on": "Kennedy Prep",
  "king-heights-academy-ca-on": "King Heights Academy",
  "king-heights-ca-on": "King Heights Academy",
  "louis-riel-academy-ca-on": "Louis-Riel Academy",
  /** Listed as Orangeville BDA on 2024-25 OSBA rosters; Orangeville Prep on association menus */
  "orangeville-bda-ca-on": "Orangeville Prep",
  "orangeville-varsity-ca-on": "Orangeville Varsity",
  "polaris-prep-academy-black-ca-on": "Polaris Prep Academy Black",
  "polaris-prep-academy-gold-ca-on": "Polaris Prep Academy Gold",
  "polaris-prep-ca-on": "Polaris Prep Academy",
  "richmond-hill-ascend-prep-ca-on": "Richmond Hill Ascend Prep",
  "scarborough-prep-ca-on": "Scarborough Prep",
  "st-judes-academy-blue-ca-on": "St. Jude's Academy Blue",
  "st-judes-academy-white-ca-on": "St. Jude's Academy White",
  "tall-pines-academy-ca-on": "Tall Pines Academy",
  "tri-city-prep-ca-on": "Tri-City Prep",
  "uchenna-academy-ca-on": "Uchenna Academy",
  "victory-academy-ca-on": "Victory Academy",
  "victory-prep-academy-east-ca-on": "Victory Prep Academy East",
  "victory-prep-academy-west-ca-on": "Victory Prep Academy West",
  "william-academy-cobourg-ca-on": "William Academy Cobourg",
};

/** Roster-table labels → canonical name when slug alone is ambiguous. */
export const CANONICAL_TEAM_NAME_BY_RAW = {
  CTA: "Canada Topflight Academy",
  "Full Circle": "Full Circle Basketball Academy",
  "King Heights": "King Heights Academy",
  "FHC Prep": "Father Henry Carr Prep",
  "Orangeville BDA": "Orangeville Prep",
  "Polaris Prep": "Polaris Prep Academy",
  "Brampton City Prep Provincials": "Brampton City Prep Provincial",
  "J.Addison School": "J. Addison School",
};

export function canonicalTeamName(slug, rawNameFromOsba) {
  if (slug && CANONICAL_TEAM_NAME_BY_SLUG[slug]) {
    return CANONICAL_TEAM_NAME_BY_SLUG[slug];
  }
  const raw = (rawNameFromOsba ?? "").trim();
  if (raw && CANONICAL_TEAM_NAME_BY_RAW[raw]) {
    return CANONICAL_TEAM_NAME_BY_RAW[raw];
  }
  return raw || slug;
}

export function abbrevFromCanonicalName(name) {
  const words = name.replace(/[^a-zA-Z0-9\s.']/g, " ").split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 5).toUpperCase();
  return words
    .map((w) => w[0])
    .join("")
    .slice(0, 6)
    .toUpperCase();
}
