import type { CanonicalLeagueTeamConfig } from "./canonical-league-teams.js";
import { loadUsportsTeamAliasReport } from "../utils/usports-team-aliases.js";
import type { UsportsTeamIdentity } from "../utils/usports-team-aliases.js";

/**
 * Current U Sports men's basketball teams (48).
 * Canonical slugs and institution names use the full official school name
 * to avoid mix-ups (e.g. Western University vs Trinity Western University).
 *
 * Source: https://en.usports.ca/sports/mbkb/2025-26/schedule
 */
export interface UsportsTeamDefinition {
  abbrev: string;
  institutionName: string;
  mascot: string;
  slug: string;
  legacySlug: string;
  displayName: string;
}

function defineUsportsTeam(
  team: Omit<UsportsTeamDefinition, "displayName"> & { displayName?: string },
): UsportsTeamDefinition {
  return {
    ...team,
    displayName: team.displayName ?? `${team.institutionName} ${team.mascot}`.trim(),
  };
}

export const USPORTS_TEAMS: readonly UsportsTeamDefinition[] = [
  defineUsportsTeam({
    abbrev: "ACADIA",
    institutionName: "Acadia University",
    mascot: "Axemen",
    slug: "acadia-university",
    legacySlug: "acadia",
  }),
  defineUsportsTeam({
    abbrev: "ALBERT",
    institutionName: "University of Alberta",
    mascot: "Golden Bears",
    slug: "university-of-alberta",
    legacySlug: "alberta",
  }),
  defineUsportsTeam({
    abbrev: "ALGOMA",
    institutionName: "Algoma University",
    mascot: "Thunderbirds",
    slug: "algoma-university",
    legacySlug: "algoma",
  }),
  defineUsportsTeam({
    abbrev: "BISHOP",
    institutionName: "Bishop's University",
    mascot: "Gaiters",
    slug: "bishop-s-university",
    legacySlug: "bishop-s",
  }),
  defineUsportsTeam({
    abbrev: "BRANDO",
    institutionName: "Brandon University",
    mascot: "Bobcats",
    slug: "brandon-university",
    legacySlug: "brandon",
  }),
  defineUsportsTeam({
    abbrev: "BROCK",
    institutionName: "Brock University",
    mascot: "Badgers",
    slug: "brock-university",
    legacySlug: "brock",
  }),
  defineUsportsTeam({
    abbrev: "CALGAR",
    institutionName: "University of Calgary",
    mascot: "Dinos",
    slug: "university-of-calgary",
    legacySlug: "calgary",
  }),
  defineUsportsTeam({
    abbrev: "CBU",
    institutionName: "Cape Breton University",
    mascot: "Capers",
    slug: "cape-breton-university",
    legacySlug: "cape-breton",
  }),
  defineUsportsTeam({
    abbrev: "CARLET",
    institutionName: "Carleton University",
    mascot: "Ravens",
    slug: "carleton-university",
    legacySlug: "carleton",
  }),
  defineUsportsTeam({
    abbrev: "CONC",
    institutionName: "Concordia University",
    mascot: "Stingers",
    slug: "concordia-university",
    legacySlug: "concordia",
  }),
  defineUsportsTeam({
    abbrev: "DALHOU",
    institutionName: "Dalhousie University",
    mascot: "Tigers",
    slug: "dalhousie-university",
    legacySlug: "dalhousie",
  }),
  defineUsportsTeam({
    abbrev: "GUELPH",
    institutionName: "University of Guelph",
    mascot: "Gryphons",
    slug: "university-of-guelph",
    legacySlug: "guelph",
  }),
  defineUsportsTeam({
    abbrev: "LAKEHD",
    institutionName: "Lakehead University",
    mascot: "Thunderwolves",
    slug: "lakehead-university",
    legacySlug: "lakehead",
  }),
  defineUsportsTeam({
    abbrev: "LAUREN",
    institutionName: "Laurentian University",
    mascot: "Voyageurs",
    slug: "laurentian-university",
    legacySlug: "laurentian",
  }),
  defineUsportsTeam({
    abbrev: "LAURIE",
    institutionName: "Wilfrid Laurier University",
    mascot: "Golden Hawks",
    slug: "wilfrid-laurier-university",
    legacySlug: "laurier",
  }),
  defineUsportsTeam({
    abbrev: "LAVAL",
    institutionName: "Université Laval",
    mascot: "Rouge et Or",
    slug: "universite-laval",
    legacySlug: "laval",
  }),
  defineUsportsTeam({
    abbrev: "LETHBR",
    institutionName: "University of Lethbridge",
    mascot: "Pronghorns",
    slug: "university-of-lethbridge",
    legacySlug: "lethbridge",
  }),
  defineUsportsTeam({
    abbrev: "MACEWA",
    institutionName: "MacEwan University",
    mascot: "Griffins",
    slug: "macewan-university",
    legacySlug: "macewan",
  }),
  defineUsportsTeam({
    abbrev: "MANITO",
    institutionName: "University of Manitoba",
    mascot: "Bisons",
    slug: "university-of-manitoba",
    legacySlug: "manitoba",
  }),
  defineUsportsTeam({
    abbrev: "MCGILL",
    institutionName: "McGill University",
    mascot: "Redbirds",
    slug: "mcgill-university",
    legacySlug: "mcgill",
  }),
  defineUsportsTeam({
    abbrev: "MCMAST",
    institutionName: "McMaster University",
    mascot: "Marauders",
    slug: "mcmaster-university",
    legacySlug: "mcmaster",
  }),
  defineUsportsTeam({
    abbrev: "MEMORI",
    institutionName: "Memorial University of Newfoundland",
    mascot: "Sea-Hawks",
    slug: "memorial-university-of-newfoundland",
    legacySlug: "memorial",
  }),
  defineUsportsTeam({
    abbrev: "MRU",
    institutionName: "Mount Royal University",
    mascot: "Cougars",
    slug: "mount-royal-university",
    legacySlug: "mount-royal",
  }),
  defineUsportsTeam({
    abbrev: "NIPISS",
    institutionName: "Nipissing University",
    mascot: "Lakers",
    slug: "nipissing-university",
    legacySlug: "nipissing",
  }),
  defineUsportsTeam({
    abbrev: "OTU",
    institutionName: "Ontario Tech University",
    mascot: "Ridgebacks",
    slug: "ontario-tech-university",
    legacySlug: "ontario-tech",
  }),
  defineUsportsTeam({
    abbrev: "OTTAWA",
    institutionName: "University of Ottawa",
    mascot: "Gee-Gees",
    slug: "university-of-ottawa",
    legacySlug: "ottawa",
  }),
  defineUsportsTeam({
    abbrev: "QUEENS",
    institutionName: "Queen's University",
    mascot: "Gaels",
    slug: "queen-s-university",
    legacySlug: "queen-s",
  }),
  defineUsportsTeam({
    abbrev: "REGINA",
    institutionName: "University of Regina",
    mascot: "Cougars",
    slug: "university-of-regina",
    legacySlug: "regina",
  }),
  defineUsportsTeam({
    abbrev: "STMARY",
    institutionName: "Saint Mary's University",
    mascot: "Huskies",
    slug: "saint-mary-s-university",
    legacySlug: "st-mary-s",
  }),
  defineUsportsTeam({
    abbrev: "SASK",
    institutionName: "University of Saskatchewan",
    mascot: "Huskies",
    slug: "university-of-saskatchewan",
    legacySlug: "saskatchewan",
  }),
  defineUsportsTeam({
    abbrev: "STFX",
    institutionName: "St. Francis Xavier University",
    mascot: "X-Men",
    slug: "st-francis-xavier-university",
    legacySlug: "st-francis-x",
  }),
  defineUsportsTeam({
    abbrev: "TRU",
    institutionName: "Thompson Rivers University",
    mascot: "WolfPack",
    slug: "thompson-rivers-university",
    legacySlug: "tru",
  }),
  defineUsportsTeam({
    abbrev: "TORONT",
    institutionName: "University of Toronto",
    mascot: "Varsity Blues",
    slug: "university-of-toronto",
    legacySlug: "toronto",
  }),
  defineUsportsTeam({
    abbrev: "TMU",
    institutionName: "Toronto Metropolitan University",
    mascot: "Bold",
    slug: "toronto-metropolitan-university",
    legacySlug: "tmu",
  }),
  defineUsportsTeam({
    abbrev: "TWU",
    institutionName: "Trinity Western University",
    mascot: "Spartans",
    slug: "trinity-western-university",
    legacySlug: "twu",
  }),
  defineUsportsTeam({
    abbrev: "UBC",
    institutionName: "University of British Columbia",
    mascot: "Thunderbirds",
    slug: "university-of-british-columbia",
    legacySlug: "ubc",
  }),
  defineUsportsTeam({
    abbrev: "UBCO",
    institutionName: "UBC Okanagan",
    mascot: "Heat",
    slug: "ubc-okanagan",
    legacySlug: "ubc-okanagan",
  }),
  defineUsportsTeam({
    abbrev: "UFV",
    institutionName: "University of the Fraser Valley",
    mascot: "Cascades",
    slug: "university-of-the-fraser-valley",
    legacySlug: "ufv",
  }),
  defineUsportsTeam({
    abbrev: "UNB",
    institutionName: "University of New Brunswick",
    mascot: "Reds",
    slug: "university-of-new-brunswick",
    legacySlug: "unb",
  }),
  defineUsportsTeam({
    abbrev: "UNBC",
    institutionName: "University of Northern British Columbia",
    mascot: "Timberwolves",
    slug: "university-of-northern-british-columbia",
    legacySlug: "unbc",
  }),
  defineUsportsTeam({
    abbrev: "UPEI",
    institutionName: "University of Prince Edward Island",
    mascot: "Panthers",
    slug: "university-of-prince-edward-island",
    legacySlug: "upei",
  }),
  defineUsportsTeam({
    abbrev: "UQAM",
    institutionName: "Université du Québec à Montréal",
    mascot: "Citadins",
    slug: "universite-du-quebec-a-montreal",
    legacySlug: "uqam",
  }),
  defineUsportsTeam({
    abbrev: "VICTOR",
    institutionName: "University of Victoria",
    mascot: "Vikes",
    slug: "university-of-victoria",
    legacySlug: "victoria",
  }),
  defineUsportsTeam({
    abbrev: "WATERL",
    institutionName: "University of Waterloo",
    mascot: "Warriors",
    slug: "university-of-waterloo",
    legacySlug: "waterloo",
  }),
  defineUsportsTeam({
    abbrev: "WESTER",
    institutionName: "Western University",
    mascot: "Mustangs",
    slug: "western-university",
    legacySlug: "western",
  }),
  defineUsportsTeam({
    abbrev: "WINDSO",
    institutionName: "University of Windsor",
    mascot: "Lancers",
    slug: "university-of-windsor",
    legacySlug: "windsor",
  }),
  defineUsportsTeam({
    abbrev: "WINNIP",
    institutionName: "University of Winnipeg",
    mascot: "Wesmen",
    slug: "university-of-winnipeg",
    legacySlug: "winnipeg",
  }),
  defineUsportsTeam({
    abbrev: "YORK",
    institutionName: "York University",
    mascot: "Lions",
    slug: "york-university",
    legacySlug: "york",
  }),
] as const;

export const USPORTS_TEAM_BY_SLUG = new Map(
  USPORTS_TEAMS.map((team) => [team.slug, team]),
);

export const USPORTS_TEAM_BY_LEGACY_SLUG = new Map(
  USPORTS_TEAMS.map((team) => [team.legacySlug, team]),
);

export const USPORTS_CURRENT_TEAM_SLUGS = new Set(
  USPORTS_TEAMS.map((team) => team.slug),
);

export const USPORTS_TEAM_DISPLAY_BY_SLUG = new Map<string, string>(
  USPORTS_TEAMS.flatMap((team) => [
    [team.slug, team.displayName],
    [team.legacySlug, team.displayName],
  ]),
);

/** Extra slug variants seen in ingest that are not in the alias report JSON. */
const USPORTS_EXTRA_SLUG_ALIASES: Record<string, string> = {
  "cape-breton-h": "cape-breton",
  "cape-breton-highlanders": "cape-breton",
  "concordia-university-college": "concordia",
  "lethbridge-university": "lethbridge",
  "laurier-university": "laurier",
  "manitoba-university": "manitoba",
  "memorial-university": "memorial",
  "memorial-university-of-new-foundland": "memorial",
  "lakehaed-university": "lakehead",
  "mc-gill-university": "mcgill",
  "queens": "queen-s",
  "joined-bishop-s-university": "bishop-s",
  "universite-de-quebec-a-montral": "uqam",
  "universite-de-quebec-a-montreal": "uqam",
  "university-of-british-columbia-okanagan": "ubc-okanagan",
  "university-of-the-fraser-vally": "ufv",
  "carleron": "carleton",
  "mount-royal-cougars": "mount-royal",
  "queen-s-college": "queen-s",
  "regina-university": "regina",
  "ryerson-college": "tmu",
  "saint-marys": "st-mary-s",
  "saint-marys-university": "st-mary-s",
  "st-mary-s-university": "st-mary-s",
  "stfrancis-x": "st-francis-x",
  "stfx": "st-francis-x",
  "the-university-of-alberta": "alberta",
  "toronto-univ": "toronto",
  "ubc-okanagan-heat": "ubc-okanagan",
  "unbc-timberwolves": "unbc",
  "university-of-laval": "laval",
  "university-of-western-ontario": "western",
  "waterloo-university": "waterloo",
  "western-ontario": "western",
  "western-university-canada": "western",
  "wilfrid-laurier-university": "laurier",
};

let cachedUsportsTeamConfig: CanonicalLeagueTeamConfig | null = null;

function mapLegacyAliasToCanonicalSlug(legacySlug: string): string | null {
  return USPORTS_TEAM_BY_LEGACY_SLUG.get(legacySlug)?.slug ?? null;
}

/** Canonical slug map for the 48 current U Sports schools + common ingest aliases. */
export function buildUsportsCanonicalTeamConfig(): CanonicalLeagueTeamConfig {
  if (cachedUsportsTeamConfig) return cachedUsportsTeamConfig;

  const slugAliases: Record<string, string> = {};
  const displayNames: Record<string, string> = {};

  for (const team of USPORTS_TEAMS) {
    slugAliases[team.slug] = team.slug;
    slugAliases[team.legacySlug] = team.slug;
    displayNames[team.slug] = team.displayName;
  }

  const report = loadUsportsTeamAliasReport();
  for (const [aliasSlug, legacyCanonical] of Object.entries(report.aliasMap)) {
    const canonical = mapLegacyAliasToCanonicalSlug(legacyCanonical.trim().toLowerCase());
    if (!canonical) continue;
    slugAliases[aliasSlug.trim().toLowerCase()] = canonical;
  }

  for (const [aliasSlug, legacyCanonical] of Object.entries(USPORTS_EXTRA_SLUG_ALIASES)) {
    const canonical = mapLegacyAliasToCanonicalSlug(legacyCanonical);
    if (canonical) slugAliases[aliasSlug] = canonical;
  }

  cachedUsportsTeamConfig = { slugAliases, displayNames };
  return cachedUsportsTeamConfig;
}

export function resolveUsportsCanonicalSlug(slug?: string | null): string | null {
  if (!slug) return null;
  const key = slug.trim().toLowerCase();
  const config = buildUsportsCanonicalTeamConfig();
  return config.slugAliases[key] ?? null;
}

export function getUsportsTeamIdentity(canonicalSlug: string): UsportsTeamIdentity {
  const team = USPORTS_TEAM_BY_SLUG.get(canonicalSlug);
  if (!team) {
    throw new Error(`Unknown U Sports canonical team slug: ${canonicalSlug}`);
  }
  return {
    slug: team.slug,
    name: team.institutionName,
    abbreviation: team.abbrev,
  };
}

/** All known slug variants grouped by full canonical slug (for DB merge/rename). */
export function buildUsportsSlugVariantsByCanonical(): Map<string, string[]> {
  const config = buildUsportsCanonicalTeamConfig();
  const byCanonical = new Map<string, Set<string>>();

  for (const [alias, canonical] of Object.entries(config.slugAliases)) {
    if (!USPORTS_CURRENT_TEAM_SLUGS.has(canonical)) continue;
    const variants = byCanonical.get(canonical) ?? new Set<string>();
    variants.add(alias);
    variants.add(canonical);
    byCanonical.set(canonical, variants);
  }

  const entries: Array<[string, string[]]> = [...byCanonical.entries()]
    .map(([canonical, variants]) => [canonical, [...variants].sort()] as [string, string[]])
    .sort(([a], [b]) => a.localeCompare(b));

  return new Map(entries);
}

export function resolveUsportsTeamDisplayName(
  slug?: string,
  fallbackName?: string,
): string | undefined {
  const canonicalSlug = resolveUsportsCanonicalSlug(slug);
  if (canonicalSlug) {
    const byCanonical = USPORTS_TEAM_DISPLAY_BY_SLUG.get(canonicalSlug);
    if (byCanonical) return byCanonical;
  }

  if (slug) {
    const bySlug = USPORTS_TEAM_DISPLAY_BY_SLUG.get(slug);
    if (bySlug) return bySlug;
  }

  if (fallbackName) {
    const normalized = fallbackName.trim().toLowerCase();
    for (const team of USPORTS_TEAMS) {
      if (
        team.institutionName.toLowerCase() === normalized ||
        team.displayName.toLowerCase() === normalized ||
        team.legacySlug === normalized
      ) {
        return team.displayName;
      }
    }
  }

  return undefined;
}
