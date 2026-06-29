/** Client-side U Sports display names — keep in sync with server/src/data/usports-teams.ts */
const USPORTS_DISPLAY_BY_SLUG: Record<string, string> = {
  acadia: "Acadia Axemen",
  alberta: "University of Alberta Golden Bears",
  algoma: "Algoma Thunderbirds",
  "bishop-s": "Bishop's Gaiters",
  brandon: "Brandon Bobcats",
  brock: "Brock Badgers",
  calgary: "University of Calgary Dinos",
  "cape-breton": "Cape Breton Capers",
  carleton: "Carleton Ravens",
  concordia: "Concordia Stingers",
  dalhousie: "Dalhousie Tigers",
  guelph: "University of Guelph Gryphons",
  lakehead: "Lakehead Thunderwolves",
  laurentian: "Laurentian Voyageurs",
  laurier: "Wilfrid Laurier Golden Hawks",
  laval: "Université Laval Rouge et Or",
  lethbridge: "University of Lethbridge Pronghorns",
  macewan: "MacEwan Griffins",
  manitoba: "University of Manitoba Bisons",
  mcgill: "McGill Redbirds",
  mcmaster: "McMaster Marauders",
  memorial: "Memorial Sea-Hawks",
  "mount-royal": "Mount Royal Cougars",
  nipissing: "Nipissing Lakers",
  "ontario-tech": "Ontario Tech Ridgebacks",
  ottawa: "Ottawa Gee-Gees",
  "queen-s": "Queen's Gaels",
  regina: "University of Regina Cougars",
  "st-mary-s": "Saint Mary's Huskies",
  saskatchewan: "University of Saskatchewan Huskies",
  "st-francis-x": "StFX X-Men",
  tru: "Thompson Rivers WolfPack",
  toronto: "University of Toronto Varsity Blues",
  tmu: "Toronto Metropolitan Bold",
  twu: "Trinity Western Spartans",
  ubc: "UBC Thunderbirds",
  "ubc-okanagan": "UBC Okanagan Heat",
  ufv: "University of the Fraser Valley Cascades",
  unb: "UNB Reds",
  unbc: "UNBC Timberwolves",
  upei: "UPEI Panthers",
  uqam: "UQAM Citadins",
  victoria: "University of Victoria Vikes",
  waterloo: "University of Waterloo Warriors",
  western: "Western Mustangs",
  windsor: "Windsor Lancers",
  winnipeg: "Winnipeg Wesmen",
  york: "York Lions",
};

export function resolveUsportsTeamDisplayName(
  teamName: string,
  options?: { slug?: string },
): string | undefined {
  if (options?.slug) {
    const bySlug = USPORTS_DISPLAY_BY_SLUG[options.slug];
    if (bySlug) return bySlug;
  }

  const normalized = teamName.trim().toLowerCase();
  for (const [slug, displayName] of Object.entries(USPORTS_DISPLAY_BY_SLUG)) {
    if (displayName.toLowerCase() === normalized || slug === normalized) {
      return displayName;
    }
  }

  return undefined;
}

export function isUsportsLeagueSlug(leagueSlug?: string): boolean {
  return leagueSlug?.toLowerCase() === "u-sports";
}
