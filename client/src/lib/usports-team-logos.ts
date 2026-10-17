/** Official athletics logos for current U Sports men's basketball teams. */
export const USPORTS_LEAGUE_LOGO =
  "https://upload.wikimedia.org/wikipedia/commons/3/34/U_Sports_Logo.svg";

const CANONICAL_LOGOS: Record<string, string> = {
  "acadia-university": "/logos/usports/acadia-university.png",
  "university-of-alberta": "/logos/usports/university-of-alberta.webp",
  "algoma-university": "/logos/usports/algoma-university.webp",
  "bishop-s-university": "/logos/usports/bishop-s-university.webp",
  "brandon-university": "/logos/usports/brandon-university.webp",
  "brock-university": "/logos/usports/brock-university.webp",
  "university-of-calgary": "/logos/usports/university-of-calgary.webp",
  "cape-breton-university": "/logos/usports/cape-breton-university.png",
  "carleton-university": "/logos/usports/carleton-university.png",
  "concordia-university": "/logos/usports/concordia-university.png",
  "dalhousie-university": "/logos/usports/dalhousie-university.png",
  "university-of-guelph": "/logos/usports/university-of-guelph.webp",
  "lakehead-university": "/logos/usports/lakehead-university.png",
  "laurentian-university": "/logos/usports/laurentian-university.png",
  "wilfrid-laurier-university": "/logos/usports/wilfrid-laurier-university.webp",
  "universite-laval": "/logos/usports/universite-laval.png",
  "university-of-lethbridge": "/logos/usports/university-of-lethbridge.webp",
  "macewan-university": "/logos/usports/macewan-university.png",
  "university-of-manitoba": "/logos/usports/university-of-manitoba.webp",
  "mcgill-university": "/logos/usports/mcgill-university.webp",
  "mcmaster-university": "/logos/usports/mcmaster-university.webp",
  "memorial-university-of-newfoundland": "/logos/usports/memorial-university-of-newfoundland.png",
  "mount-royal-university": "/logos/usports/mount-royal-university.webp",
  "nipissing-university": "/logos/usports/nipissing-university.webp",
  "ontario-tech-university": "/logos/usports/ontario-tech-university.png",
  "university-of-ottawa": "/logos/usports/university-of-ottawa.png",
  "queen-s-university": "/logos/usports/queen-s-university.webp",
  "university-of-regina": "/logos/usports/university-of-regina.webp",
  "saint-mary-s-university": "/logos/usports/saint-mary-s-university.png",
  "university-of-saskatchewan": "/logos/usports/university-of-saskatchewan.webp",
  "st-francis-xavier-university": "/logos/usports/st-francis-xavier-university.png",
  "thompson-rivers-university": "/logos/usports/thompson-rivers-university.webp",
  "university-of-toronto": "/logos/usports/university-of-toronto.webp",
  "toronto-metropolitan-university": "/logos/usports/toronto-metropolitan-university.webp",
  "trinity-western-university": "/logos/usports/trinity-western-university.png",
  "university-of-british-columbia": "/logos/usports/university-of-british-columbia.webp",
  "ubc-okanagan": "/logos/usports/ubc-okanagan.webp",
  "university-of-the-fraser-valley": "/logos/usports/university-of-the-fraser-valley.png",
  "university-of-new-brunswick": "/logos/usports/university-of-new-brunswick.png",
  "university-of-northern-british-columbia":
    "/logos/usports/university-of-northern-british-columbia.webp",
  "university-of-prince-edward-island": "/logos/usports/university-of-prince-edward-island.png",
  "universite-du-quebec-a-montreal": "/logos/usports/universite-du-quebec-a-montreal.png",
  "university-of-victoria": "/logos/usports/university-of-victoria.webp",
  "university-of-waterloo": "/logos/usports/university-of-waterloo.webp",
  "western-university": "/logos/usports/western-university.webp",
  "university-of-windsor": "/logos/usports/university-of-windsor.webp",
  "university-of-winnipeg": "/logos/usports/university-of-winnipeg.webp",
  "york-university": "/logos/usports/york-university.webp",
};

const ALIAS_TO_CANONICAL: Record<string, string> = {
  acadia: "acadia-university",
  alberta: "university-of-alberta",
  "the-university-of-alberta": "university-of-alberta",
  algoma: "algoma-university",
  "bishop-s": "bishop-s-university",
  brandon: "brandon-university",
  brock: "brock-university",
  calgary: "university-of-calgary",
  "cape-breton": "cape-breton-university",
  carleton: "carleton-university",
  concordia: "concordia-university",
  dalhousie: "dalhousie-university",
  "daltigers": "dalhousie-university",
  guelph: "university-of-guelph",
  lakehead: "lakehead-university",
  laurentian: "laurentian-university",
  laurier: "wilfrid-laurier-university",
  laval: "universite-laval",
  lethbridge: "university-of-lethbridge",
  macewan: "macewan-university",
  manitoba: "university-of-manitoba",
  mcgill: "mcgill-university",
  mcmaster: "mcmaster-university",
  memorial: "memorial-university-of-newfoundland",
  "mount-royal": "mount-royal-university",
  nipissing: "nipissing-university",
  "ontario-tech": "ontario-tech-university",
  ottawa: "university-of-ottawa",
  "queen-s": "queen-s-university",
  regina: "university-of-regina",
  "st-mary-s": "saint-mary-s-university",
  saskatchewan: "university-of-saskatchewan",
  "st-francis-x": "st-francis-xavier-university",
  tru: "thompson-rivers-university",
  toronto: "university-of-toronto",
  tmu: "toronto-metropolitan-university",
  twu: "trinity-western-university",
  ubc: "university-of-british-columbia",
  ufv: "university-of-the-fraser-valley",
  unb: "university-of-new-brunswick",
  unbc: "university-of-northern-british-columbia",
  upei: "university-of-prince-edward-island",
  uqam: "universite-du-quebec-a-montreal",
  victoria: "university-of-victoria",
  waterloo: "university-of-waterloo",
  western: "western-university",
  "western-university-canada": "western-university",
  "western-ontario": "western-university",
  windsor: "university-of-windsor",
  winnipeg: "university-of-winnipeg",
  york: "york-university",
  "cape-breton-h": "cape-breton-university",
  "cape-breton-highlanders": "cape-breton-university",
  "concordia-university-college": "concordia-university",
  "lethbridge-university": "university-of-lethbridge",
  "laurier-university": "wilfrid-laurier-university",
  "manitoba-university": "university-of-manitoba",
  "memorial-university": "memorial-university-of-newfoundland",
  "lakehaed-university": "lakehead-university",
  "mc-gill-university": "mcgill-university",
  queens: "queen-s-university",
  "universite-de-quebec-a-montreal": "universite-du-quebec-a-montreal",
  "university-of-british-columbia-okanagan": "ubc-okanagan",
  "university-of-the-fraser-vally": "university-of-the-fraser-valley",
  "mount-royal-cougars": "mount-royal-university",
  "ryerson-college": "toronto-metropolitan-university",
  ryerson: "toronto-metropolitan-university",
  "saint-marys": "saint-mary-s-university",
  "saint-marys-university": "saint-mary-s-university",
  "st-mary-s-university": "saint-mary-s-university",
  "toronto-metropolitan": "toronto-metropolitan-university",
  stfx: "st-francis-xavier-university",
  "dalhousie-tigers": "dalhousie-university",
  "ubc-okanagan-heat": "ubc-okanagan",
  "university-of-laval": "universite-laval",
  "university-of-western-ontario": "western-university",
};

function nameToSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const CANONICAL_SLUGS_BY_LENGTH = Object.keys(CANONICAL_LOGOS).sort((a, b) => b.length - a.length);

function resolveCanonicalSlug(value: string): string | undefined {
  const key = nameToSlug(value);
  if (!key) return undefined;
  if (CANONICAL_LOGOS[key]) return key;
  const alias = ALIAS_TO_CANONICAL[key];
  if (alias && CANONICAL_LOGOS[alias]) return alias;
  for (const canonical of CANONICAL_SLUGS_BY_LENGTH) {
    if (key.startsWith(`${canonical}-`) || key.endsWith(`-${canonical}`)) return canonical;
  }
  return undefined;
}

export function usportsTeamLogoUrl(options?: {
  slug?: string;
  teamName?: string;
}): string | undefined {
  const fromSlug = options?.slug ? resolveCanonicalSlug(options.slug) : undefined;
  if (fromSlug) return CANONICAL_LOGOS[fromSlug];
  const fromName = options?.teamName ? resolveCanonicalSlug(options.teamName) : undefined;
  if (fromName) return CANONICAL_LOGOS[fromName];
  return undefined;
}
