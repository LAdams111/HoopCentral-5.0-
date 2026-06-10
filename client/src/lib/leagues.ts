export interface LeagueInfo {
  name: string;
  slug: string;
  tier: string;
  description: string;
  logoUrl?: string;
  regions: string[];
}

export const DOMESTIC_LEAGUES: LeagueInfo[] = [
  {
    name: "NBA",
    slug: "NBA",
    tier: "Professional",
    description:
      "The National Basketball Association - the premier professional basketball league in the world.",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/en/0/03/National_Basketball_Association_logo.svg",
    regions: ["US", "CA"],
  },
  {
    name: "WNBA",
    slug: "WNBA",
    tier: "Professional",
    description:
      "The Women's National Basketball Association - the premier professional women's basketball league in the world.",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/2/2f/WNBA_Logo_2019.svg",
    regions: ["US"],
  },
  {
    name: "NBA G League",
    slug: "G-League",
    tier: "Professional",
    description: "The official minor league organization of the NBA.",
    logoUrl: "https://cdn.nba.com/logos/leagues/logo-gleague.svg",
    regions: ["US", "CA", "MX"],
  },
  {
    name: "NCAA Division I",
    slug: "NCAA",
    tier: "Collegiate",
    description: "The highest level of intercollegiate athletics sanctioned by the NCAA.",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/d/dd/NCAA_logo.svg",
    regions: ["US"],
  },
  {
    name: "U Sports",
    slug: "USports",
    tier: "Collegiate",
    description:
      "Canada's national governing body for university sport, featuring top collegiate basketball programs across the country.",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/3/34/U_Sports_Logo.svg",
    regions: ["CA"],
  },
  {
    name: "Overtime Elite (OTE)",
    slug: "OTE",
    tier: "Professional",
    description:
      "A professional basketball league for late-stage high school and early college-level players.",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/7/73/OvertimeEliteLogo.png",
    regions: ["US"],
  },
  {
    name: "High School",
    slug: "High-School",
    tier: "Amateur",
    description:
      "Varsity high school basketball programs across the country producing top collegiate and professional talent.",
    regions: ["US", "CA"],
  },
  {
    name: "AAU",
    slug: "AAU",
    tier: "Amateur",
    description:
      "The Amateur Athletic Union organizes competitive club basketball for youth and high school players nationwide.",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/en/f/f6/Amateur_Athletic_Union_%28logo%29.png",
    regions: ["US"],
  },
];

export const INTERNATIONAL_LEAGUES: LeagueInfo[] = [
  {
    name: "EuroLeague",
    slug: "EuroLeague",
    tier: "Professional",
    description:
      "The top-tier European professional basketball club competition, featuring the best teams from across the continent.",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/en/f/fb/Euroleague_Basketball_logo.svg",
    regions: ["EU"],
  },
  {
    name: "Liga ACB",
    slug: "ACB",
    tier: "Professional",
    description:
      "Spain's premier professional basketball league and one of the strongest domestic leagues in the world.",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/e/e7/Liga_Endesa_2019_logo.svg",
    regions: ["ES"],
  },
  {
    name: "NBL Australia",
    slug: "NBL",
    tier: "Professional",
    description:
      "Australia's top professional basketball league, increasingly a pathway for NBA-bound international talent.",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/en/b/b2/NBL_%28Australia%29_logo.svg",
    regions: ["AU"],
  },
  {
    name: "Basketball Africa League",
    slug: "BAL",
    tier: "Professional",
    description:
      "The premier professional basketball league on the African continent, backed by the NBA and FIBA.",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/en/b/b0/Basketball_Africa_League.svg",
    regions: ["ZA"],
  },
  {
    name: "Chinese Basketball Association",
    slug: "CBA",
    tier: "Professional",
    description:
      "China's top professional basketball league with a growing international presence.",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/en/5/53/Chinese_Basketball_Association.svg",
    regions: ["CN"],
  },
  {
    name: "B.League (Japan)",
    slug: "BLeague",
    tier: "Professional",
    description:
      "Japan's top professional basketball league, known for its passionate fanbase and rising talent development.",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7a/B.League_logo.svg",
    regions: ["JP"],
  },
];

export const ALL_LEAGUES = [...DOMESTIC_LEAGUES, ...INTERNATIONAL_LEAGUES];

export function findLeague(slug: string | undefined): LeagueInfo | undefined {
  if (!slug) return undefined;
  const normalized = slug.toLowerCase();
  return ALL_LEAGUES.find(
    (l) =>
      l.slug.toLowerCase() === normalized ||
      l.name.toLowerCase() === normalized ||
      l.slug.toLowerCase().replace(/-/g, "") === normalized.replace(/-/g, ""),
  );
}

export const LEAGUE_DISPLAY: Record<
  string,
  { display: string; tier: string; description: string; logoUrl?: string; defaultSeason: string }
> = {
  NBA: {
    display: "NBA",
    tier: "Professional",
    description:
      "The National Basketball Association - the premier professional basketball league in the world.",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/en/0/03/National_Basketball_Association_logo.svg",
    defaultSeason: "2025-26",
  },
  WNBA: {
    display: "WNBA",
    tier: "Professional",
    description:
      "The Women's National Basketball Association - the premier professional women's basketball league in the world.",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/2/2f/WNBA_Logo_2019.svg",
    defaultSeason: "2025-26",
  },
  "G-League": {
    display: "NBA G League",
    tier: "Professional",
    description: "The official minor league organization of the NBA.",
    logoUrl: "https://cdn.nba.com/logos/leagues/logo-gleague.svg",
    defaultSeason: "2025-26",
  },
  NCAA: {
    display: "NCAA Division I",
    tier: "Collegiate",
    description: "The highest level of intercollegiate athletics sanctioned by the NCAA.",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/d/dd/NCAA_logo.svg",
    defaultSeason: "2025-26",
  },
};
