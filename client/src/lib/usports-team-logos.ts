/** Official athletics logos for current U Sports men's basketball teams. */
export const USPORTS_LEAGUE_LOGO =
  "https://upload.wikimedia.org/wikipedia/commons/3/34/U_Sports_Logo.svg";

const CANONICAL_LOGOS: Record<string, string> = {
  "acadia-university": "https://acadiaathletics.ca/images/setup/Primary_Logo_-_1x.png",
  "university-of-alberta": "https://bearsandpandas.ca/images/logos/site/site.png",
  "algoma-university": "https://algomathunderbirds.ca/images/logos/site/site.png",
  "bishop-s-university": "https://gaiters.ca/images/logos/site/site.png",
  "brandon-university": "https://gobobcats.ca/images/logos/site/site.png",
  "brock-university": "https://gobadgers.ca/images/logos/site/site.png",
  "university-of-calgary": "https://godinos.com/images/logos/site/site.png",
  "cape-breton-university":
    "https://gocapersgo.ca/images/setup2023/sitelogos/CBUA2000_Lockup_Capers-Charging.png",
  "carleton-university": "https://goravens.ca/images/logos/site/site.svg",
  "concordia-university": "https://stingers.ca/apple-icon-180x180.png",
  "dalhousie-university": "https://daltigers.ca/images/logos/site/site.svg",
  "university-of-guelph": "https://gryphons.ca/images/logos/site/site.png",
  "lakehead-university": "https://thunderwolves.ca/images/logos/site/site.svg",
  "laurentian-university": "https://luvoyageurs.com/images/logos/site/site.svg",
  "wilfrid-laurier-university": "https://laurierathletics.com/images/logos/site/site.png",
  "universite-laval":
    "https://rougeetor.ulaval.ca/wp-content/themes/rougeetor/img/common/logo-rouge-et-or-universite-laval-print.png",
  "university-of-lethbridge": "https://gohorns.ca/images/logos/site/site.png",
  "macewan-university": "https://www.macewangriffins.ca/images/logos/site/site.svg",
  "university-of-manitoba": "https://gobisons.ca/images/logos/site/site.png",
  "mcgill-university": "https://mcgillathletics.ca/images/logos/site/site.png",
  "mcmaster-university": "https://marauders.ca/images/logos/site/site.png",
  "memorial-university-of-newfoundland": "https://goseahawks.ca/images/logos/site/site.svg",
  "mount-royal-university": "https://mrucougars.com/images/logos/site/site.png",
  "nipissing-university": "https://nulakers.ca/images/logos/site/site.png",
  "ontario-tech-university": "https://goridgebacks.com/images/logos/site/site.svg",
  "university-of-ottawa": "https://teams.geegees.ca/images/logos/site/site.svg",
  "queen-s-university": "https://gogaelsgo.com/images/logos/site/site.png",
  "university-of-regina": "https://cougarsandrams.com/images/logos/site/site.png",
  "saint-mary-s-university": "https://smuhuskies.ca/images/logos/site/site.svg",
  "university-of-saskatchewan": "https://huskies.usask.ca/images/logos/site/site.png",
  "st-francis-xavier-university": "https://goxgo.ca/images/logos/site/site.svg",
  "thompson-rivers-university": "https://gowolfpack.ca/images/logos/site/site.png",
  "university-of-toronto": "https://varsityblues.ca/images/logos/site/site.png",
  "toronto-metropolitan-university": "https://tmubold.ca/images/logos/site/site.png",
  "trinity-western-university":
    "https://dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/gospartans.ca/images/logos/site/site.png",
  "university-of-british-columbia": "https://gothunderbirds.ca/images/logos/site/site.png",
  "ubc-okanagan": "https://goheat.ca/images/logos/site/site.png",
  "university-of-the-fraser-valley":
    "https://dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/fraservalley.sidearmsports.com/images/logos/site/site.png",
  "university-of-new-brunswick": "https://goredsgo.ca/images/logos/site/site.svg",
  "university-of-northern-british-columbia":
    "https://unbctimberwolves.com/images/logos/site/site.png",
  "university-of-prince-edward-island": "https://gopanthersgo.ca/images/logos/site/site.svg",
  "university-of-victoria": "https://govikesgo.com/images/logos/site/site.png",
  "university-of-waterloo": "https://athletics.uwaterloo.ca/images/logos/site/site.png",
  "western-university": "https://westernmustangs.ca/images/logos/site/site.png",
  "university-of-windsor": "https://golancers.ca/images/logos/site/site.png",
  "university-of-winnipeg": "https://wesmen.ca/images/logos/site/site.png",
  "york-university": "https://yorkulions.ca/images/logos/site/site.png",
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
};

function nameToSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function usportsTeamLogoUrl(options?: {
  slug?: string;
  teamName?: string;
}): string | undefined {
  const raw = options?.slug?.trim().toLowerCase();
  if (raw) {
    const canonical = ALIAS_TO_CANONICAL[raw] ?? raw;
    if (CANONICAL_LOGOS[canonical]) return CANONICAL_LOGOS[canonical];
  }
  if (options?.teamName) {
    const fromName = nameToSlug(options.teamName);
    const canonical = ALIAS_TO_CANONICAL[fromName] ?? fromName;
    if (CANONICAL_LOGOS[canonical]) return CANONICAL_LOGOS[canonical];
  }
  return undefined;
}
