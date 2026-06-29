/**
 * Current U Sports men's basketball teams (48).
 * Sourced from the official 2025-26 season:
 * https://en.usports.ca/sports/mbkb/2025-26/schedule
 */
export const USPORTS_TEAMS = [
  { abbrev: "ACADIA", name: "Acadia", displayName: "Acadia Axemen", slug: "acadia" },
  {
    abbrev: "ALBERT",
    name: "Alberta",
    displayName: "University of Alberta Golden Bears",
    slug: "alberta",
  },
  { abbrev: "ALGOMA", name: "Algoma", displayName: "Algoma Thunderbirds", slug: "algoma" },
  { abbrev: "BISHOP", name: "Bishop's", displayName: "Bishop's Gaiters", slug: "bishop-s" },
  { abbrev: "BRANDO", name: "Brandon", displayName: "Brandon Bobcats", slug: "brandon" },
  { abbrev: "BROCK", name: "Brock", displayName: "Brock Badgers", slug: "brock" },
  {
    abbrev: "CALGAR",
    name: "Calgary",
    displayName: "University of Calgary Dinos",
    slug: "calgary",
  },
  { abbrev: "CBU", name: "Cape Breton", displayName: "Cape Breton Capers", slug: "cape-breton" },
  { abbrev: "CARLET", name: "Carleton", displayName: "Carleton Ravens", slug: "carleton" },
  { abbrev: "CONC", name: "Concordia", displayName: "Concordia Stingers", slug: "concordia" },
  { abbrev: "DALHOU", name: "Dalhousie", displayName: "Dalhousie Tigers", slug: "dalhousie" },
  {
    abbrev: "GUELPH",
    name: "Guelph",
    displayName: "University of Guelph Gryphons",
    slug: "guelph",
  },
  { abbrev: "LAKEHD", name: "Lakehead", displayName: "Lakehead Thunderwolves", slug: "lakehead" },
  { abbrev: "LAUREN", name: "Laurentian", displayName: "Laurentian Voyageurs", slug: "laurentian" },
  {
    abbrev: "LAURIE",
    name: "Laurier",
    displayName: "Wilfrid Laurier Golden Hawks",
    slug: "laurier",
  },
  {
    abbrev: "LAVAL",
    name: "Laval",
    displayName: "Université Laval Rouge et Or",
    slug: "laval",
  },
  {
    abbrev: "LETHBR",
    name: "Lethbridge",
    displayName: "University of Lethbridge Pronghorns",
    slug: "lethbridge",
  },
  { abbrev: "MACEWA", name: "MacEwan", displayName: "MacEwan Griffins", slug: "macewan" },
  {
    abbrev: "MANITO",
    name: "Manitoba",
    displayName: "University of Manitoba Bisons",
    slug: "manitoba",
  },
  { abbrev: "MCGILL", name: "McGill", displayName: "McGill Redbirds", slug: "mcgill" },
  { abbrev: "MCMAST", name: "McMaster", displayName: "McMaster Marauders", slug: "mcmaster" },
  {
    abbrev: "MEMORI",
    name: "Memorial",
    displayName: "Memorial Sea-Hawks",
    slug: "memorial",
  },
  { abbrev: "MRU", name: "Mount Royal", displayName: "Mount Royal Cougars", slug: "mount-royal" },
  { abbrev: "NIPISS", name: "Nipissing", displayName: "Nipissing Lakers", slug: "nipissing" },
  {
    abbrev: "OTU",
    name: "Ontario Tech",
    displayName: "Ontario Tech Ridgebacks",
    slug: "ontario-tech",
  },
  { abbrev: "OTTAWA", name: "Ottawa", displayName: "Ottawa Gee-Gees", slug: "ottawa" },
  { abbrev: "QUEENS", name: "Queen's", displayName: "Queen's Gaels", slug: "queen-s" },
  {
    abbrev: "REGINA",
    name: "Regina",
    displayName: "University of Regina Cougars",
    slug: "regina",
  },
  { abbrev: "STMARY", name: "Saint Mary's", displayName: "Saint Mary's Huskies", slug: "st-mary-s" },
  {
    abbrev: "SASK",
    name: "Saskatchewan",
    displayName: "University of Saskatchewan Huskies",
    slug: "saskatchewan",
  },
  { abbrev: "STFX", name: "StFX", displayName: "StFX X-Men", slug: "st-francis-x" },
  {
    abbrev: "TRU",
    name: "Thompson Rivers",
    displayName: "Thompson Rivers WolfPack",
    slug: "tru",
  },
  {
    abbrev: "TORONT",
    name: "Toronto",
    displayName: "University of Toronto Varsity Blues",
    slug: "toronto",
  },
  {
    abbrev: "TMU",
    name: "Toronto Metropolitan",
    displayName: "Toronto Metropolitan Bold",
    slug: "tmu",
  },
  {
    abbrev: "TWU",
    name: "Trinity Western",
    displayName: "Trinity Western Spartans",
    slug: "twu",
  },
  { abbrev: "UBC", name: "UBC", displayName: "UBC Thunderbirds", slug: "ubc" },
  { abbrev: "UBCO", name: "UBCO", displayName: "UBC Okanagan Heat", slug: "ubc-okanagan" },
  {
    abbrev: "UFV",
    name: "UFV",
    displayName: "University of the Fraser Valley Cascades",
    slug: "ufv",
  },
  { abbrev: "UNB", name: "UNB", displayName: "UNB Reds", slug: "unb" },
  { abbrev: "UNBC", name: "UNBC", displayName: "UNBC Timberwolves", slug: "unbc" },
  { abbrev: "UPEI", name: "UPEI", displayName: "UPEI Panthers", slug: "upei" },
  { abbrev: "UQAM", name: "UQAM", displayName: "UQAM Citadins", slug: "uqam" },
  {
    abbrev: "VICTOR",
    name: "Victoria",
    displayName: "University of Victoria Vikes",
    slug: "victoria",
  },
  {
    abbrev: "WATERL",
    name: "Waterloo",
    displayName: "University of Waterloo Warriors",
    slug: "waterloo",
  },
  { abbrev: "WESTER", name: "Western", displayName: "Western Mustangs", slug: "western" },
  { abbrev: "WINDSO", name: "Windsor", displayName: "Windsor Lancers", slug: "windsor" },
  { abbrev: "WINNIP", name: "Winnipeg", displayName: "Winnipeg Wesmen", slug: "winnipeg" },
  { abbrev: "YORK", name: "York", displayName: "York Lions", slug: "york" },
] as const;

export const USPORTS_CURRENT_TEAM_SLUGS = new Set(
  USPORTS_TEAMS.map((team) => team.slug),
);

export const USPORTS_TEAM_DISPLAY_BY_SLUG = new Map<string, string>(
  USPORTS_TEAMS.map((team) => [team.slug, team.displayName]),
);

export function resolveUsportsTeamDisplayName(
  slug?: string,
  fallbackName?: string,
): string | undefined {
  if (slug) {
    const bySlug = USPORTS_TEAM_DISPLAY_BY_SLUG.get(slug);
    if (bySlug) return bySlug;
  }

  if (fallbackName) {
    const normalized = fallbackName.trim().toLowerCase();
    for (const team of USPORTS_TEAMS) {
      if (
        team.name.toLowerCase() === normalized ||
        team.displayName.toLowerCase() === normalized
      ) {
        return team.displayName;
      }
    }
  }

  return undefined;
}
