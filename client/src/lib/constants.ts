import {
  Calendar,
  Home,
  Sparkles,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ncaaTeamLogoUrl, resolveNcaaEspnId } from "./ncaa-team-logos";

export const DEFAULT_HEADSHOT =
  "https://cdn.nba.com/headshots/nba/latest/1040x760/1040x760/fallback.png";

export const NBA_TEAM_IDS: Record<string, string> = {
  "Atlanta Hawks": "1610612737",
  "Boston Celtics": "1610612738",
  "Brooklyn Nets": "1610612751",
  "Charlotte Hornets": "1610612766",
  "Chicago Bulls": "1610612741",
  "Cleveland Cavaliers": "1610612739",
  "Dallas Mavericks": "1610612742",
  "Denver Nuggets": "1610612743",
  "Detroit Pistons": "1610612765",
  "Golden State Warriors": "1610612744",
  "Houston Rockets": "1610612745",
  "Indiana Pacers": "1610612754",
  "LA Clippers": "1610612746",
  "Los Angeles Lakers": "1610612747",
  "Memphis Grizzlies": "1610612763",
  "Miami Heat": "1610612748",
  "Milwaukee Bucks": "1610612749",
  "Minnesota Timberwolves": "1610612750",
  "New Orleans Pelicans": "1610612740",
  "New York Knicks": "1610612752",
  "Oklahoma City Thunder": "1610612760",
  "Orlando Magic": "1610612753",
  "Philadelphia 76ers": "1610612755",
  "Phoenix Suns": "1610612756",
  "Portland Trail Blazers": "1610612757",
  "Sacramento Kings": "1610612758",
  "San Antonio Spurs": "1610612759",
  "Toronto Raptors": "1610612761",
  "Utah Jazz": "1610612762",
  "Washington Wizards": "1610612764",
};

export const G_LEAGUE_TEAM_IDS: Record<string, string> = {
  "Austin Spurs": "1612709890",
  "Birmingham Squadron": "1612709913",
  "Capital City Go-Go": "1612709928",
  "Cleveland Charge": "1612709893",
  "Coachella Valley Lakers": "1612709905",
  "College Park Skyhawks": "1612709929",
  "Delaware Blue Coats": "1612709909",
  "Grand Rapids Gold": "1612709917",
  "Greensboro Swarm": "1612709922",
  "Indiana Mad Ants": "1612709910",
  "Iowa Wolves": "1612709911",
  "Laketown Squadron": "1612709913",
  "Long Island Nets": "1612709921",
  "Maine Celtics": "1612709915",
  "Memphis Hustle": "1612709926",
  "Mexico City Capitanes": "1612709931",
  "Motor City Cruise": "1612709932",
  "Noblesville Boom": "1612709910",
  "Oklahoma City Blue": "1612709889",
  "Osceola Magic": "1612709925",
  "Raptors 905": "1612709920",
  "Rio Grande Valley Vipers": "1612709908",
  "Rip City Remix": "1612709933",
  "Salt Lake City Stars": "1612709903",
  "San Diego Clippers": "1612709924",
  "Santa Cruz Warriors": "1612709902",
  "Sioux Falls Skyforce": "1612709904",
  "South Bay Lakers": "1612709905",
  "Stockton Kings": "1612709914",
  "Texas Legends": "1612709918",
  "Valley Suns": "1612709934",
  "Westchester Knicks": "1612709919",
  "Windy City Bulls": "1612709923",
  "Wisconsin Herd": "1612709927",
};

export const G_LEAGUE_TEAM_ABBREV_IDS: Record<string, string> = {
  AUS: "1612709890",
  BIR: "1612709913",
  CCG: "1612709928",
  CLC: "1612709893",
  CPS: "1612709929",
  CVL: "1612709905",
  DEL: "1612709909",
  GBO: "1612709922",
  GRG: "1612709917",
  IND: "1612709910",
  IWA: "1612709911",
  LIN: "1612709921",
  LKS: "1612709913",
  MCC: "1612709932",
  MHU: "1612709926",
  MNE: "1612709915",
  MXC: "1612709931",
  NOB: "1612709910",
  OKC: "1612709889",
  OKL: "1612709889",
  ORL: "1612709925",
  OSC: "1612709925",
  RAP: "1612709920",
  RGV: "1612709908",
  RIP: "1612709933",
  SBL: "1612709905",
  SCW: "1612709902",
  SDC: "1612709924",
  SLC: "1612709903",
  STO: "1612709914",
  SXF: "1612709904",
  TEX: "1612709918",
  VAL: "1612709934",
  WCB: "1612709923",
  WES: "1612709919",
  WIS: "1612709927",
};

export const WNBA_TEAM_ABBREVS: Record<string, string> = {
  "Atlanta Dream": "ATL",
  "Chicago Sky": "CHI",
  "Connecticut Sun": "CON",
  "Dallas Wings": "DAL",
  "Golden State Valkyries": "GSV",
  "Indiana Fever": "IND",
  "Las Vegas Aces": "LVA",
  "Los Angeles Sparks": "LAS",
  "Minnesota Lynx": "MIN",
  "New York Liberty": "NYL",
  "Phoenix Mercury": "PHO",
  "Seattle Storm": "SEA",
  "Washington Mystics": "WAS",
};

export function nbaTeamLogoUrl(teamName: string, variant: "global" | "primary" = "global") {
  const id = NBA_TEAM_IDS[teamName] ?? "1610612737";
  const path = variant === "primary" ? "primary" : "global";
  return `https://cdn.nba.com/logos/nba/${id}/${path}/L/logo.svg`;
}

export function wnbaTeamLogoUrl(teamName: string, abbreviation?: string) {
  const abbr = (abbreviation ?? WNBA_TEAM_ABBREVS[teamName] ?? "ATL").toUpperCase();
  return `https://stats.wnba.com/media/img/teams/logos/${abbr}.svg`;
}

export function gleagueTeamLogoUrl(
  teamName: string,
  abbreviation?: string,
  variant: "global" | "primary" = "global",
) {
  const abbr = abbreviation?.toUpperCase();
  const id =
    G_LEAGUE_TEAM_IDS[teamName] ??
    (abbr ? G_LEAGUE_TEAM_ABBREV_IDS[abbr] : undefined);
  if (!id) {
    return "https://cdn.nba.com/logos/leagues/logo-gleague.svg";
  }
  const path = variant === "primary" ? "primary" : "global";
  return `https://cdn.nba.com/logos/nbagleague/${id}/${path}/L/logo.svg`;
}

export function teamLogoUrl(
  teamName: string,
  options?: {
    leagueSlug?: string;
    abbreviation?: string;
    slug?: string;
    variant?: "global" | "primary";
  },
) {
  const leagueSlug = options?.leagueSlug?.toLowerCase();
  const ncaaOptions = {
    abbreviation: options?.abbreviation,
    slug: options?.slug,
  };

  if (leagueSlug === "ncaa") {
    return ncaaTeamLogoUrl(teamName, ncaaOptions);
  }
  if (leagueSlug === "g-league" || G_LEAGUE_TEAM_IDS[teamName]) {
    return gleagueTeamLogoUrl(
      teamName,
      options?.abbreviation,
      options?.variant ?? "global",
    );
  }
  if (leagueSlug === "wnba" || WNBA_TEAM_ABBREVS[teamName]) {
    return wnbaTeamLogoUrl(teamName, options?.abbreviation);
  }
  if (leagueSlug === "nba" || NBA_TEAM_IDS[teamName]) {
    return nbaTeamLogoUrl(teamName, options?.variant ?? "global");
  }
  if (resolveNcaaEspnId(teamName, ncaaOptions)) {
    return ncaaTeamLogoUrl(teamName, ncaaOptions);
  }
  return nbaTeamLogoUrl(teamName, options?.variant ?? "global");
}

export function seasonLabelToUrlYear(seasonLabel: string): string {
  return seasonLabel.split("-")[0] ?? seasonLabel;
}

export const SEASON_START_YEAR = 1987;

export function getCurrentSeasonYear(): number {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() + 1 >= 10 ? year : year - 1;
}

export function seasonYearToLabel(year: number): string {
  const endYear = String(year + 1).slice(-2);
  return `${year}-${endYear}`;
}

export function generateSeasonYears(): number[] {
  const current = getCurrentSeasonYear();
  return Array.from(
    { length: current - SEASON_START_YEAR + 1 },
    (_, index) => current - index,
  );
}

export function formatSeasonHeading(seasonKey: string): string {
  if (/^\d{4}$/.test(seasonKey)) {
    return seasonYearToLabel(parseInt(seasonKey, 10));
  }
  return seasonKey;
}

export function seasonKeyToYear(seasonKey: string): string {
  if (/^\d{4}$/.test(seasonKey)) {
    return seasonKey;
  }
  return seasonLabelToUrlYear(seasonKey);
}

export function rosterPath(teamName: string, season?: string): string {
  const seasonKey =
    season ?? seasonYearToLabel(getCurrentSeasonYear());
  return `/roster/${encodeURIComponent(teamName)}/${encodeURIComponent(seasonKey)}`;
}

export const NAV_ITEMS: {
  label: string;
  href: string;
  icon: LucideIcon;
}[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Leagues", href: "/leagues", icon: Trophy },
  { label: "Prospects", href: "/prospects", icon: Sparkles },
  { label: "Birth Year", href: "/classes", icon: Calendar },
  { label: "Directory", href: "/players", icon: Users },
];
