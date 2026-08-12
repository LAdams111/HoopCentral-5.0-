import type { LeagueSummary } from "@/lib/api";

export interface LeagueDisplayMeta {
  display: string;
  tier: string;
  description: string;
  logoUrl?: string;
  regions: string[];
  category: "domestic" | "international";
}

export const LEAGUE_DISPLAY: Record<string, LeagueDisplayMeta> = {
  nba: {
    display: "NBA",
    tier: "Professional",
    description:
      "The National Basketball Association - the premier professional basketball league in the world.",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/en/0/03/National_Basketball_Association_logo.svg",
    regions: ["US", "CA"],
    category: "domestic",
  },
  wnba: {
    display: "WNBA",
    tier: "Professional",
    description:
      "The Women's National Basketball Association - the premier professional women's basketball league in the world.",
    logoUrl: "https://cdn.nba.com/logos/leagues/logo-wnba.svg",
    regions: ["US"],
    category: "domestic",
  },
  "g-league": {
    display: "NBA G League",
    tier: "Professional",
    description: "The official minor league organization of the NBA.",
    logoUrl: "https://cdn.nba.com/logos/leagues/logo-gleague.svg",
    regions: ["US", "CA", "MX"],
    category: "domestic",
  },
  ncaa: {
    display: "NCAA Division I",
    tier: "Collegiate",
    description:
      "The highest level of intercollegiate athletics sanctioned by the NCAA.",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/d/dd/NCAA_logo.svg",
    regions: ["US"],
    category: "domestic",
  },
  "ncaa-m": {
    display: "NCAA Division I (Men)",
    tier: "Collegiate",
    description:
      "The highest level of men's intercollegiate basketball sanctioned by the NCAA.",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/d/dd/NCAA_logo.svg",
    regions: ["US"],
    category: "domestic",
  },
  "ncaa-w": {
    display: "NCAA Division I (Women)",
    tier: "Collegiate",
    description:
      "The highest level of women's intercollegiate basketball sanctioned by the NCAA.",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/d/dd/NCAA_logo.svg",
    regions: ["US"],
    category: "domestic",
  },
  "ncaa-d2": {
    display: "NCAA Division II",
    tier: "Collegiate",
    description:
      "The second tier of intercollegiate athletics sanctioned by the NCAA, featuring competitive programs across the United States.",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/d/dd/NCAA_logo.svg",
    regions: ["US"],
    category: "domestic",
  },
  "ncaa-d3": {
    display: "NCAA Division III",
    tier: "Collegiate",
    description:
      "The largest NCAA division, featuring non-scholarship collegiate basketball programs across the United States.",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/d/dd/NCAA_logo.svg",
    regions: ["US"],
    category: "domestic",
  },
  naia: {
    display: "NAIA",
    tier: "Collegiate",
    description:
      "The National Association of Intercollegiate Athletics — small-college basketball across the United States.",
    logoUrl: "https://upload.wikimedia.org/wikipedia/en/8/8e/NAIA_logo.svg",
    regions: ["US"],
    category: "domestic",
  },
  juco: {
    display: "Junior College",
    tier: "Collegiate",
    description:
      "NJCAA and other junior college basketball programs across the United States.",
    logoUrl: "https://upload.wikimedia.org/wikipedia/en/4/4e/NJCAA_logo.svg",
    regions: ["US"],
    category: "domestic",
  },
  "u-sports": {
    display: "U Sports",
    tier: "Collegiate",
    description:
      "Canada's national governing body for university sport, featuring top collegiate basketball programs across the country.",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/3/34/U_Sports_Logo.svg",
    regions: ["CA"],
    category: "domestic",
  },
  ccaa: {
    display: "CCAA",
    tier: "Collegiate",
    description:
      "The Canadian Collegiate Athletic Association — national governing body for college sport in Canada.",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/8/88/Canadian_collegiate_athl_logo.svg",
    regions: ["CA"],
    category: "domestic",
  },
  ote: {
    display: "Overtime Elite (OTE)",
    tier: "Professional",
    description:
      "A professional basketball league for late-stage high school and early college-level players.",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/7/73/OvertimeEliteLogo.png",
    regions: ["US"],
    category: "domestic",
  },
  "high-school": {
    display: "High School (Boys)",
    tier: "Amateur",
    description:
      "Varsity boys high school basketball programs across the United States and Canada.",
    regions: ["US", "CA"],
    category: "domestic",
  },
  "high-school-w": {
    display: "High School (Girls)",
    tier: "Amateur",
    description:
      "Varsity girls high school basketball programs across the United States and Canada.",
    regions: ["US", "CA"],
    category: "domestic",
  },
  aau: {
    display: "AAU",
    tier: "Amateur",
    description:
      "The Amateur Athletic Union organizes competitive club basketball for youth and high school players nationwide.",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/en/f/f6/Amateur_Athletic_Union_%28logo%29.png",
    regions: ["US"],
    category: "domestic",
  },
  euroleague: {
    display: "EuroLeague",
    tier: "Professional",
    description:
      "The top-tier European professional basketball club competition, featuring the best teams from across the continent.",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/en/f/fb/Euroleague_Basketball_logo.svg",
    regions: ["EU"],
    category: "international",
  },
  acb: {
    display: "Liga ACB",
    tier: "Professional",
    description:
      "Spain's premier professional basketball league and one of the strongest domestic leagues in the world.",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/e/e7/Liga_Endesa_2019_logo.svg",
    regions: ["ES"],
    category: "international",
  },
  nbl: {
    display: "NBL Australia",
    tier: "Professional",
    description:
      "Australia's top professional basketball league, increasingly a pathway for NBA-bound international talent.",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/en/b/b2/NBL_%28Australia%29_logo.svg",
    regions: ["AU"],
    category: "international",
  },
  bal: {
    display: "Basketball Africa League",
    tier: "Professional",
    description:
      "The premier professional basketball league on the African continent, backed by the NBA and FIBA.",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/en/b/b0/Basketball_Africa_League.svg",
    regions: ["ZA"],
    category: "international",
  },
  cba: {
    display: "Chinese Basketball Association",
    tier: "Professional",
    description:
      "China's top professional basketball league with a growing international presence.",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/en/5/53/Chinese_Basketball_Association.svg",
    regions: ["CN"],
    category: "international",
  },
  "b-league": {
    display: "B.League (Japan)",
    tier: "Professional",
    description:
      "Japan's top professional basketball league, known for its passionate fanbase and rising talent development.",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7a/B.League_logo.svg",
    regions: ["JP"],
    category: "international",
  },
  "lnb-pro-a": {
    display: "LNB Pro A",
    tier: "Professional",
    description:
      "France's top professional basketball league, including Jeep and Betclic sponsorship eras.",
    regions: ["FR"],
    category: "international",
  },
  "lnb-u21": {
    display: "LNB Pro A U21",
    tier: "Professional",
    description: "French professional under-21 development league.",
    regions: ["FR"],
    category: "international",
  },
};

export interface LeagueCardData {
  slug: string;
  name: string;
  tier: string;
  description: string;
  logoUrl?: string;
  regions: string[];
  teamCount: number;
}

export function enrichLeague(league: LeagueSummary): LeagueCardData {
  const meta = LEAGUE_DISPLAY[league.slug];
  return {
    slug: league.slug,
    name: meta?.display ?? league.name,
    tier: meta?.tier ?? "Professional",
    description: meta?.description ?? "",
    logoUrl: meta?.logoUrl,
    regions: meta?.regions ?? [],
    teamCount: league.teamCount,
  };
}

export function getLeagueDisplay(slug: string, name: string) {
  const meta = LEAGUE_DISPLAY[slug.toLowerCase()];
  return {
    display: meta?.display ?? name,
    tier: meta?.tier ?? "Professional",
    description: meta?.description ?? "",
    logoUrl: meta?.logoUrl,
  };
}

export function groupLeaguesForDisplay(leagues: LeagueSummary[]): {
  domestic: LeagueCardData[];
  international: LeagueCardData[];
  other: LeagueCardData[];
} {
  const domesticOrder = [
    "nba",
    "wnba",
    "g-league",
    "ncaa-m",
    "u-sports",
    "ccaa",
    "ncaa-w",
    "ncaa-d2",
    "ote",
    "high-school",
    "high-school-w",
    "aau",
  ];
  const internationalOrder = [
    "euroleague",
    "acb",
    "lnb-pro-a",
    "lnb-u21",
    "nbl",
    "bal",
    "cba",
    "b-league",
  ];

  const enriched = leagues.map(enrichLeague);
  const bySlug = new Map(enriched.map((league) => [league.slug, league]));

  const orderBySlugList = (order: string[]) =>
    order
      .map((slug) => bySlug.get(slug))
      .filter((league): league is LeagueCardData => Boolean(league));

  const known = new Set([...domesticOrder, ...internationalOrder]);
  const rest = enriched.filter((league) => !known.has(league.slug));
  const discovered = rest.filter((l) => !LEAGUE_DISPLAY[l.slug]?.category);
  const discoveredWithTeams = discovered
    .filter((l) => l.teamCount > 0)
    .sort((a, b) => b.teamCount - a.teamCount || a.name.localeCompare(b.name));
  const other = discovered
    .filter((l) => l.teamCount === 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    domestic: [
      ...orderBySlugList(domesticOrder),
      ...rest.filter((l) => LEAGUE_DISPLAY[l.slug]?.category === "domestic"),
    ],
    international: [
      ...orderBySlugList(internationalOrder),
      ...rest.filter((l) => LEAGUE_DISPLAY[l.slug]?.category === "international"),
      ...discoveredWithTeams,
    ],
    other,
  };
}
