/**
 * Current CCAA men's basketball schools (65).
 * Slugs match existing Hoop Central CCAA team rows so official ingest
 * enriches those pages instead of creating new ones.
 * Display names always use the full school + mascot.
 */
export type CcaaConferenceId = "pacwest" | "acac" | "ocaa" | "acaa" | "rseq" | "mcac";

export interface CcaaTeamDefinition {
  abbrev: string;
  institutionName: string;
  mascot: string;
  slug: string;
  conference: CcaaConferenceId;
  /** PrestoSports team path, or RSEQ StatCrew file stem. */
  conferenceCode: string;
  displayName: string;
  aliases?: readonly string[];
}

export const CCAA_CONFERENCE_SITES: Record<
  CcaaConferenceId,
  { name: string; host: string; kind: "presto" | "rseq" }
> = {
  pacwest: { name: "PACWEST", host: "https://pacwestbc.ca", kind: "presto" },
  acac: { name: "ACAC", host: "https://www.acac.ab.ca", kind: "presto" },
  ocaa: { name: "OCAA", host: "https://www.ocaa.com", kind: "presto" },
  acaa: { name: "ACAA", host: "https://acaa.ca", kind: "presto" },
  mcac: { name: "MCAC", host: "https://mcacathletics.ca", kind: "presto" },
  rseq: { name: "RSEQ", host: "https://www.rseq-stats.ca", kind: "rseq" },
};

function defineCcaaTeam(
  team: Omit<CcaaTeamDefinition, "displayName"> & { displayName?: string },
): CcaaTeamDefinition {
  return {
    ...team,
    displayName: team.displayName ?? `${team.institutionName} ${team.mascot}`.trim(),
  };
}

export const CCAA_TEAMS: readonly CcaaTeamDefinition[] = [
  // PACWEST
  defineCcaaTeam({ abbrev: "CAMOSN", institutionName: "Camosun College", mascot: "Chargers", slug: "camosun", conference: "pacwest", conferenceCode: "camosun" }),
  defineCcaaTeam({ abbrev: "CAPILN", institutionName: "Capilano University", mascot: "Blues", slug: "capilano", conference: "pacwest", conferenceCode: "capilano" }),
  defineCcaaTeam({ abbrev: "CBC", institutionName: "Columbia Bible College", mascot: "Bearcats", slug: "cbc", conference: "pacwest", conferenceCode: "cbc" }),
  defineCcaaTeam({ abbrev: "DOUGLS", institutionName: "Douglas College", mascot: "Royals", slug: "douglas", conference: "pacwest", conferenceCode: "douglas" }),
  defineCcaaTeam({ abbrev: "LANGRA", institutionName: "Langara College", mascot: "Falcons", slug: "langara", conference: "pacwest", conferenceCode: "langara" }),
  defineCcaaTeam({ abbrev: "OKANGN", institutionName: "Okanagan College", mascot: "Coyotes", slug: "okanagan", conference: "pacwest", conferenceCode: "okanagan" }),
  defineCcaaTeam({ abbrev: "VIU", institutionName: "Vancouver Island University", mascot: "Mariners", slug: "viu", conference: "pacwest", conferenceCode: "viu" }),

  // ACAC
  defineCcaaTeam({ abbrev: "AMBROS", institutionName: "Ambrose University", mascot: "Lions", slug: "ambrose", conference: "acac", conferenceCode: "ambroseuniversity", aliases: ["ambrose-university"] }),
  defineCcaaTeam({
    abbrev: "AUGUST",
    institutionName: "University of Alberta Augustana",
    mascot: "Vikings",
    slug: "uofa-augustana",
    conference: "acac",
    conferenceCode: "universityofalbertaaugustana",
    aliases: ["alb-augustana", "university-of-alberta-augustana"],
  }),
  defineCcaaTeam({ abbrev: "BRIERC", institutionName: "Briercrest College", mascot: "Clippers", slug: "briercrest", conference: "acac", conferenceCode: "briercrestcollege", aliases: ["briercrest-college"] }),
  defineCcaaTeam({
    abbrev: "CUE",
    institutionName: "Concordia University of Edmonton",
    mascot: "Thunder",
    slug: "concordia",
    conference: "acac",
    conferenceCode: "concordiauniversityofedmonton",
    aliases: ["concordia-university-of-edmonton", "concordia-edmonton"],
  }),
  defineCcaaTeam({ abbrev: "KEYANO", institutionName: "Keyano College", mascot: "Huskies", slug: "keyano", conference: "acac", conferenceCode: "keyanocollege" }),
  defineCcaaTeam({
    abbrev: "KINGS",
    institutionName: "The King's University",
    mascot: "Eagles",
    slug: "the-king-s",
    conference: "acac",
    conferenceCode: "thekingsuniversity",
    aliases: ["the-kings-university", "kings-univ", "the-kings"],
  }),
  defineCcaaTeam({ abbrev: "LAKELN", institutionName: "Lakeland College", mascot: "Rustlers", slug: "lakeland", conference: "acac", conferenceCode: "lakelandcollege" }),
  defineCcaaTeam({
    abbrev: "LETHCO",
    institutionName: "Lethbridge Polytechnic",
    mascot: "Kodiaks",
    slug: "lethbridge",
    conference: "acac",
    conferenceCode: "lethbridgepolytechnic",
    aliases: ["lethbridge-college", "lethbridge-polytechnic"],
  }),
  defineCcaaTeam({ abbrev: "MEDHAT", institutionName: "Medicine Hat College", mascot: "Rattlers", slug: "medicine-hat", conference: "acac", conferenceCode: "medicinehatcollege" }),
  defineCcaaTeam({
    abbrev: "NAIT",
    institutionName: "Northern Alberta Institute of Technology",
    mascot: "Ooks",
    slug: "nait",
    conference: "acac",
    conferenceCode: "nait",
    aliases: ["northern-alberta-institute-of-technology"],
  }),
  defineCcaaTeam({
    abbrev: "NWP",
    institutionName: "Northwestern Polytechnic",
    mascot: "Wolves",
    slug: "nwp",
    conference: "acac",
    conferenceCode: "northwesternpolytechnic",
    aliases: ["grande-prairie", "grande-prairie-regional-college", "northwestern-polytechnic"],
  }),
  defineCcaaTeam({ abbrev: "OLDS", institutionName: "Olds College", mascot: "Broncos", slug: "olds", conference: "acac", conferenceCode: "oldscollege" }),
  defineCcaaTeam({
    abbrev: "RDP",
    institutionName: "Red Deer Polytechnic",
    mascot: "Kings",
    slug: "red-deer",
    conference: "acac",
    conferenceCode: "reddeerpolytechnic",
    aliases: ["red-deer-college", "red-deer-polytechnic"],
  }),
  defineCcaaTeam({
    abbrev: "SAIT",
    institutionName: "Southern Alberta Institute of Technology",
    mascot: "Trojans",
    slug: "sait",
    conference: "acac",
    conferenceCode: "sait",
    aliases: [
      "southern-alberta-institute-of-technology",
      "s-alberta-institute-of-technology",
      "southern-alberta-instof-tech",
    ],
  }),
  defineCcaaTeam({
    abbrev: "STMU",
    institutionName: "St. Mary's University",
    mascot: "Lightning",
    slug: "stmu",
    conference: "acac",
    conferenceCode: "stmarysuniversity",
    aliases: ["st-mary-s-university-college", "st-marys-university-calgary"],
  }),

  // OCAA
  defineCcaaTeam({ abbrev: "ALGONQ", institutionName: "Algonquin College", mascot: "Wolves", slug: "algonquin", conference: "ocaa", conferenceCode: "algonquin" }),
  defineCcaaTeam({ abbrev: "CANADO", institutionName: "Canadore College", mascot: "Panthers", slug: "canadore", conference: "ocaa", conferenceCode: "canadore" }),
  defineCcaaTeam({ abbrev: "CENTEN", institutionName: "Centennial College", mascot: "Colts", slug: "centennial", conference: "ocaa", conferenceCode: "centennial" }),
  defineCcaaTeam({ abbrev: "CONEST", institutionName: "Conestoga College", mascot: "Condors", slug: "conestoga", conference: "ocaa", conferenceCode: "conestoga" }),
  defineCcaaTeam({ abbrev: "DURHAM", institutionName: "Durham College", mascot: "Lords", slug: "durham", conference: "ocaa", conferenceCode: "durham" }),
  defineCcaaTeam({ abbrev: "FANSHA", institutionName: "Fanshawe College", mascot: "Falcons", slug: "fanshawe", conference: "ocaa", conferenceCode: "fanshawe" }),
  defineCcaaTeam({ abbrev: "FLEMNG", institutionName: "Fleming College", mascot: "Phoenix", slug: "fleming", conference: "ocaa", conferenceCode: "fleming" }),
  defineCcaaTeam({ abbrev: "GBC", institutionName: "George Brown College", mascot: "Huskies", slug: "george-brown", conference: "ocaa", conferenceCode: "georgebrown", aliases: ["georgebrown"] }),
  defineCcaaTeam({ abbrev: "GEORGN", institutionName: "Georgian College", mascot: "Grizzlies", slug: "georgian", conference: "ocaa", conferenceCode: "georgian" }),
  defineCcaaTeam({ abbrev: "HUMBER", institutionName: "Humber College", mascot: "Hawks", slug: "humber", conference: "ocaa", conferenceCode: "humber", aliases: ["humber-college"] }),
  defineCcaaTeam({
    abbrev: "LACITE",
    institutionName: "Collège La Cité",
    mascot: "Coyotes",
    slug: "la-cite",
    conference: "ocaa",
    conferenceCode: "lacite",
    aliases: ["lacite", "la-cite-college"],
  }),
  defineCcaaTeam({ abbrev: "LAMBTN", institutionName: "Lambton College", mascot: "Lions", slug: "lambton", conference: "ocaa", conferenceCode: "lambton" }),
  defineCcaaTeam({ abbrev: "LOYALS", institutionName: "Loyalist College", mascot: "Lancers", slug: "loyalist", conference: "ocaa", conferenceCode: "loyalist" }),
  defineCcaaTeam({ abbrev: "MOHAWK", institutionName: "Mohawk College", mascot: "Mountaineers", slug: "mohawk", conference: "ocaa", conferenceCode: "mohawk" }),
  defineCcaaTeam({ abbrev: "NIAGRA", institutionName: "Niagara College", mascot: "Knights", slug: "niagara", conference: "ocaa", conferenceCode: "niagara" }),
  defineCcaaTeam({ abbrev: "REDEEM", institutionName: "Redeemer University", mascot: "Royals", slug: "redeemer", conference: "ocaa", conferenceCode: "redeemer" }),
  defineCcaaTeam({
    abbrev: "SENECA",
    institutionName: "Seneca Polytechnic",
    mascot: "Sting",
    slug: "seneca",
    conference: "ocaa",
    conferenceCode: "seneca",
    aliases: ["seneca-college"],
  }),
  defineCcaaTeam({ abbrev: "SHERDN", institutionName: "Sheridan College", mascot: "Bruins", slug: "sheridan", conference: "ocaa", conferenceCode: "sheridan", aliases: ["sheridan-college"] }),
  defineCcaaTeam({ abbrev: "STCLAR", institutionName: "St. Clair College", mascot: "Saints", slug: "st-clair", conference: "ocaa", conferenceCode: "stclair", aliases: ["stclair"] }),
  defineCcaaTeam({
    abbrev: "STLAW",
    institutionName: "St. Lawrence College",
    mascot: "Surge",
    slug: "st-lawrence",
    conference: "ocaa",
    conferenceCode: "stlawrence",
    aliases: ["stlawrence"],
  }),

  // RSEQ (Cégep D1)
  defineCcaaTeam({
    abbrev: "AHUNTS",
    institutionName: "Collège Ahuntsic",
    mascot: "Aigles",
    slug: "ahuntsic",
    conference: "rseq",
    conferenceCode: "ahu",
    aliases: ["team-ahuntsic", "college-ahuntsic"],
  }),
  defineCcaaTeam({
    abbrev: "CHSTL",
    institutionName: "Champlain College Saint-Lambert",
    mascot: "Cavaliers",
    slug: "ch-st-lambert",
    conference: "rseq",
    conferenceCode: "sla",
    aliases: ["college-champlain-st-lambert", "champlain-college-division-2", "ch.-st-lambert"],
  }),
  defineCcaaTeam({ abbrev: "DAWSON", institutionName: "Dawson College", mascot: "Blues", slug: "dawson", conference: "rseq", conferenceCode: "daw" }),
  defineCcaaTeam({
    abbrev: "EDMONT",
    institutionName: "Cégep Édouard-Montpetit",
    mascot: "Lynx",
    slug: "edouard-montp",
    conference: "rseq",
    conferenceCode: "cem",
    aliases: ["coll-ge-edouard-montpetit", "edouard-montpetit"],
  }),
  defineCcaaTeam({
    abbrev: "BREBEF",
    institutionName: "Collège Jean-de-Brébeuf",
    mascot: "Dynamiques",
    slug: "jean-de-breb",
    conference: "rseq",
    conferenceCode: "bre",
    aliases: ["jean-de-brebeuf"],
  }),
  defineCcaaTeam({ abbrev: "JOHABB", institutionName: "John Abbott College", mascot: "Islanders", slug: "john-abbott", conference: "rseq", conferenceCode: "jac" }),
  defineCcaaTeam({
    abbrev: "MONTMO",
    institutionName: "Collège Montmorency",
    mascot: "Nomades",
    slug: "montmorency",
    conference: "rseq",
    conferenceCode: "mon",
    aliases: ["colege-montmorency", "college-montmorency"],
  }),
  defineCcaaTeam({ abbrev: "OUTAOU", institutionName: "Cégep de l'Outaouais", mascot: "Griffons", slug: "outaouais", conference: "rseq", conferenceCode: "out" }),
  defineCcaaTeam({
    abbrev: "STEFOY",
    institutionName: "Cégep de Sainte-Foy",
    mascot: "Dynamiques",
    slug: "sainte-foy",
    conference: "rseq",
    conferenceCode: "csf",
    aliases: ["cegep-de-ste-foy"],
  }),
  defineCcaaTeam({
    abbrev: "SHERBR",
    institutionName: "Cégep de Sherbrooke",
    mascot: "Volontaires",
    slug: "sherbrooke",
    conference: "rseq",
    conferenceCode: "she",
    aliases: ["cegep-de-sherbrooke"],
  }),
  defineCcaaTeam({ abbrev: "THETFD", institutionName: "Cégep de Thetford", mascot: "Filons", slug: "thetford", conference: "rseq", conferenceCode: "the" }),
  defineCcaaTeam({ abbrev: "VANIER", institutionName: "Vanier College", mascot: "Cheetahs", slug: "vanier", conference: "rseq", conferenceCode: "van" }),

  // ACAA
  defineCcaaTeam({ abbrev: "CRANDL", institutionName: "Crandall University", mascot: "Chargers", slug: "crandall", conference: "acaa", conferenceCode: "crandall" }),
  defineCcaaTeam({ abbrev: "HOLAND", institutionName: "Holland College", mascot: "Hurricanes", slug: "holland", conference: "acaa", conferenceCode: "holland", aliases: ["holland-hurricanes"] }),
  defineCcaaTeam({
    abbrev: "MTA",
    institutionName: "Mount Allison University",
    mascot: "Mounties",
    slug: "mount-allison",
    conference: "acaa",
    conferenceCode: "mountallison",
    aliases: ["mountallison"],
  }),
  defineCcaaTeam({
    abbrev: "MSVU",
    institutionName: "Mount Saint Vincent University",
    mascot: "Mystics",
    slug: "msvu",
    conference: "acaa",
    conferenceCode: "mountsaintvincent",
    aliases: ["mountsaintvincent"],
  }),
  defineCcaaTeam({ abbrev: "STU", institutionName: "St. Thomas University", mascot: "Tommies", slug: "st-thomas", conference: "acaa", conferenceCode: "stthomas", aliases: ["stthomas"] }),
  defineCcaaTeam({
    abbrev: "UKC",
    institutionName: "University of King's College",
    mascot: "Blue Devils",
    slug: "university-of-kings-college",
    conference: "acaa",
    conferenceCode: "ukc",
    aliases: ["kings-college", "ukc", "kings", "universityofkingscollege"],
  }),
  defineCcaaTeam({
    abbrev: "UNBSJ",
    institutionName: "University of New Brunswick Saint John",
    mascot: "Seawolves",
    slug: "unbsj",
    conference: "acaa",
    conferenceCode: "unbsj",
    aliases: ["unb-saint-john"],
  }),

  // MCAC
  defineCcaaTeam({
    abbrev: "CMU",
    institutionName: "Canadian Mennonite University",
    mascot: "Blazers",
    slug: "canadian-mennonite-university",
    conference: "mcac",
    conferenceCode: "canadianmennoniteuniversity",
    aliases: ["cmu"],
  }),
  defineCcaaTeam({
    abbrev: "PUC",
    institutionName: "Providence University College",
    mascot: "Pilots",
    slug: "providence-university-college",
    conference: "mcac",
    conferenceCode: "providenceuniversitycollege",
    aliases: ["puc"],
  }),
  defineCcaaTeam({
    abbrev: "RRC",
    institutionName: "Red River College Polytechnic",
    mascot: "Rebels",
    slug: "red-river-college",
    conference: "mcac",
    conferenceCode: "rrcpolytech",
    aliases: ["rrc", "rrc-polytech", "red-river-college-polytechnic"],
  }),
  defineCcaaTeam({
    abbrev: "USB",
    institutionName: "Université de Saint-Boniface",
    mascot: "Les Rouges",
    slug: "saint-boniface",
    conference: "mcac",
    conferenceCode: "stboniface",
    aliases: ["st-boniface", "stboniface", "universite-de-saint-boniface"],
  }),
];

export const CCAA_TEAM_BY_SLUG = new Map(CCAA_TEAMS.map((team) => [team.slug, team]));
export const CCAA_CURRENT_TEAM_SLUGS = new Set(CCAA_TEAMS.map((team) => team.slug));

const CCAA_SLUG_ALIASES: Record<string, string> = {};
for (const team of CCAA_TEAMS) {
  CCAA_SLUG_ALIASES[team.conferenceCode] = team.slug;
  for (const alias of team.aliases ?? []) {
    CCAA_SLUG_ALIASES[alias.trim().toLowerCase()] = team.slug;
  }
}

/** Extra DB slugs that should resolve to an official CCAA school (display only). */
const CCAA_DISPLAY_ALIASES: Record<string, string> = {
  "ambrose-university": "ambrose",
  "briercrest-college": "briercrest",
  "concordia-university-of-edmonton": "concordia",
  "concordia-edmonton": "concordia",
  "lethbridge-college": "lethbridge",
  "lethbridge-polytechnic": "lethbridge",
  "northern-alberta-institute-of-technology": "nait",
  "southern-alberta-institute-of-technology": "sait",
  "southern-alberta-instof-tech": "sait",
  "s-alberta-institute-of-technology": "sait",
  "grande-prairie": "nwp",
  "grande-prairie-regional-college": "nwp",
  "northwestern-polytechnic": "nwp",
  "red-deer-college": "red-deer",
  "red-deer-polytechnic": "red-deer",
  "the-kings-university": "the-king-s",
  "the-kings": "the-king-s",
  "university-of-alberta-augustana": "uofa-augustana",
  "alb-augustana": "uofa-augustana",
  georgebrown: "george-brown",
  lacite: "la-cite",
  "humber-college": "humber",
  "seneca-college": "seneca",
  stclair: "st-clair",
  stlawrence: "st-lawrence",
  "college-champlain-st-lambert": "ch-st-lambert",
  "team-ahuntsic": "ahuntsic",
  "colege-montmorency": "montmorency",
  "cegep-de-ste-foy": "sainte-foy",
  "cegep-de-sherbrooke": "sherbrooke",
  mountallison: "mount-allison",
  mountsaintvincent: "msvu",
  stthomas: "st-thomas",
  "kings-college": "university-of-kings-college",
  ukc: "university-of-kings-college",
  "unb-saint-john": "unbsj",
  cmu: "canadian-mennonite-university",
  puc: "providence-university-college",
  rrc: "red-river-college",
  "rrc-polytech": "red-river-college",
  "st-boniface": "saint-boniface",
  stboniface: "saint-boniface",
};

export function resolveCcaaOfficialSlug(slug?: string | null): string | null {
  if (!slug) return null;
  const key = slug.trim().toLowerCase();
  if (CCAA_TEAM_BY_SLUG.has(key)) return key;
  const aliased = CCAA_SLUG_ALIASES[key] ?? CCAA_DISPLAY_ALIASES[key];
  return aliased && CCAA_TEAM_BY_SLUG.has(aliased) ? aliased : null;
}

export function ccaaOfficialSlugVariants(slug: string): string[] {
  const key = slug.trim().toLowerCase();
  const official = resolveCcaaOfficialSlug(key);
  const variants = new Set<string>([key]);
  if (!official) return [...variants];

  variants.add(official);
  const team = CCAA_TEAM_BY_SLUG.get(official);
  if (team?.conferenceCode) variants.add(team.conferenceCode.toLowerCase());
  for (const alias of team?.aliases ?? []) variants.add(alias.trim().toLowerCase());
  for (const [alias, canonical] of Object.entries(CCAA_DISPLAY_ALIASES)) {
    if (canonical === official) variants.add(alias);
  }
  return [...variants];
}

export function buildCcaaCanonicalTeamConfig(): {
  slugAliases: Record<string, string>;
  displayNames: Record<string, string>;
} {
  const slugAliases: Record<string, string> = {};
  const displayNames: Record<string, string> = {};

  for (const team of CCAA_TEAMS) {
    slugAliases[team.slug] = team.slug;
    displayNames[team.slug] = team.displayName;
    if (team.conferenceCode) slugAliases[team.conferenceCode.toLowerCase()] = team.slug;
    for (const alias of team.aliases ?? []) {
      slugAliases[alias.trim().toLowerCase()] = team.slug;
    }
  }
  for (const [alias, canonical] of Object.entries(CCAA_DISPLAY_ALIASES)) {
    if (CCAA_TEAM_BY_SLUG.has(canonical)) slugAliases[alias] = canonical;
  }

  return { slugAliases, displayNames };
}

export function resolveCcaaTeamDisplayName(
  slug?: string | null,
  fallbackName?: string | null,
): string | null {
  const key = slug?.trim().toLowerCase() ?? "";
  const official =
    resolveCcaaOfficialSlug(key) ??
    (CCAA_DISPLAY_ALIASES[key] ? resolveCcaaOfficialSlug(CCAA_DISPLAY_ALIASES[key]) : null);
  if (official) return CCAA_TEAM_BY_SLUG.get(official)?.displayName ?? null;
  return fallbackName?.trim() || null;
}

export function ccaaConferenceTeamUrl(team: CcaaTeamDefinition, season: string): string {
  const site = CCAA_CONFERENCE_SITES[team.conference];
  if (site.kind === "rseq") {
    const yy = `${season.slice(2, 4)}${season.slice(7, 9)}`;
    return `${site.host}/collegial/basketball-m-d1/stats/${yy}/${team.conferenceCode}.htm`;
  }
  return `${site.host}/sports/mbkb/${season}/teams/${team.conferenceCode}?view=lineup&jsRendering=true`;
}
