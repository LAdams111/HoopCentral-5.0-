/** Client-side U Sports display names — keep in sync with server/src/data/usports-teams.ts */
const USPORTS_DISPLAY_BY_SLUG: Record<string, string> = {
  "acadia-university": "Acadia University Axemen",
  acadia: "Acadia University Axemen",
  "university-of-alberta": "University of Alberta Golden Bears",
  alberta: "University of Alberta Golden Bears",
  "the-university-of-alberta": "University of Alberta Golden Bears",
  "algoma-university": "Algoma University Thunderbirds",
  algoma: "Algoma University Thunderbirds",
  "bishop-s-university": "Bishop's University Gaiters",
  "bishop-s": "Bishop's University Gaiters",
  "brandon-university": "Brandon University Bobcats",
  brandon: "Brandon University Bobcats",
  "brock-university": "Brock University Badgers",
  brock: "Brock University Badgers",
  "university-of-calgary": "University of Calgary Dinos",
  calgary: "University of Calgary Dinos",
  "cape-breton-university": "Cape Breton University Capers",
  "cape-breton": "Cape Breton University Capers",
  "carleton-university": "Carleton University Ravens",
  carleton: "Carleton University Ravens",
  "concordia-university": "Concordia University Stingers",
  concordia: "Concordia University Stingers",
  "dalhousie-university": "Dalhousie University Tigers",
  dalhousie: "Dalhousie University Tigers",
  "university-of-guelph": "University of Guelph Gryphons",
  guelph: "University of Guelph Gryphons",
  "lakehead-university": "Lakehead University Thunderwolves",
  lakehead: "Lakehead University Thunderwolves",
  "laurentian-university": "Laurentian University Voyageurs",
  laurentian: "Laurentian University Voyageurs",
  "wilfrid-laurier-university": "Wilfrid Laurier University Golden Hawks",
  laurier: "Wilfrid Laurier University Golden Hawks",
  "universite-laval": "Université Laval Rouge et Or",
  laval: "Université Laval Rouge et Or",
  "university-of-lethbridge": "University of Lethbridge Pronghorns",
  lethbridge: "University of Lethbridge Pronghorns",
  "macewan-university": "MacEwan University Griffins",
  macewan: "MacEwan University Griffins",
  "university-of-manitoba": "University of Manitoba Bisons",
  manitoba: "University of Manitoba Bisons",
  "mcgill-university": "McGill University Redbirds",
  mcgill: "McGill University Redbirds",
  "mcmaster-university": "McMaster University Marauders",
  mcmaster: "McMaster University Marauders",
  "memorial-university-of-newfoundland": "Memorial University of Newfoundland Sea-Hawks",
  memorial: "Memorial University of Newfoundland Sea-Hawks",
  "mount-royal-university": "Mount Royal University Cougars",
  "mount-royal": "Mount Royal University Cougars",
  "nipissing-university": "Nipissing University Lakers",
  nipissing: "Nipissing University Lakers",
  "ontario-tech-university": "Ontario Tech University Ridgebacks",
  "ontario-tech": "Ontario Tech University Ridgebacks",
  "university-of-ottawa": "University of Ottawa Gee-Gees",
  ottawa: "University of Ottawa Gee-Gees",
  "queen-s-university": "Queen's University Gaels",
  "queen-s": "Queen's University Gaels",
  "university-of-regina": "University of Regina Cougars",
  regina: "University of Regina Cougars",
  "saint-mary-s-university": "Saint Mary's University Huskies",
  "st-mary-s": "Saint Mary's University Huskies",
  "university-of-saskatchewan": "University of Saskatchewan Huskies",
  saskatchewan: "University of Saskatchewan Huskies",
  "st-francis-xavier-university": "St. Francis Xavier University X-Men",
  "st-francis-x": "St. Francis Xavier University X-Men",
  "thompson-rivers-university": "Thompson Rivers University WolfPack",
  tru: "Thompson Rivers University WolfPack",
  "university-of-toronto": "University of Toronto Varsity Blues",
  toronto: "University of Toronto Varsity Blues",
  "toronto-metropolitan-university": "Toronto Metropolitan University Bold",
  tmu: "Toronto Metropolitan University Bold",
  "trinity-western-university": "Trinity Western University Spartans",
  twu: "Trinity Western University Spartans",
  "university-of-british-columbia": "University of British Columbia Thunderbirds",
  ubc: "University of British Columbia Thunderbirds",
  "ubc-okanagan": "UBC Okanagan Heat",
  "university-of-the-fraser-valley": "University of the Fraser Valley Cascades",
  ufv: "University of the Fraser Valley Cascades",
  "university-of-new-brunswick": "University of New Brunswick Reds",
  unb: "University of New Brunswick Reds",
  "university-of-northern-british-columbia": "University of Northern British Columbia Timberwolves",
  unbc: "University of Northern British Columbia Timberwolves",
  "university-of-prince-edward-island": "University of Prince Edward Island Panthers",
  upei: "University of Prince Edward Island Panthers",
  "universite-du-quebec-a-montreal": "Université du Québec à Montréal Citadins",
  uqam: "Université du Québec à Montréal Citadins",
  "university-of-victoria": "University of Victoria Vikes",
  victoria: "University of Victoria Vikes",
  "university-of-waterloo": "University of Waterloo Warriors",
  waterloo: "University of Waterloo Warriors",
  "western-university": "Western University Mustangs",
  western: "Western University Mustangs",
  "western-university-canada": "Western University Mustangs",
  "western-ontario": "Western University Mustangs",
  "university-of-windsor": "University of Windsor Lancers",
  windsor: "University of Windsor Lancers",
  "university-of-winnipeg": "University of Winnipeg Wesmen",
  winnipeg: "University of Winnipeg Wesmen",
  "york-university": "York University Lions",
  york: "York University Lions",
};

export function resolveUsportsTeamDisplayName(
  teamName: string,
  options?: { slug?: string },
): string | undefined {
  if (options?.slug) {
    const bySlug = USPORTS_DISPLAY_BY_SLUG[options.slug.toLowerCase()];
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
