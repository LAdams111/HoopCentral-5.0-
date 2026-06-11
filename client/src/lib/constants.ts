import {
  Calendar,
  Home,
  Sparkles,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

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

export function teamLogoUrl(
  teamName: string,
  options?: {
    leagueSlug?: string;
    abbreviation?: string;
    variant?: "global" | "primary";
  },
) {
  const leagueSlug = options?.leagueSlug?.toLowerCase();
  if (leagueSlug === "wnba" || WNBA_TEAM_ABBREVS[teamName]) {
    return wnbaTeamLogoUrl(teamName, options?.abbreviation);
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
