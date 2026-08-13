/** Map historical / alternate draft-team names to current NBA.com logo franchise names. */
export const DRAFT_TEAM_LOGO_ALIASES: Record<string, string> = {
  "Atlanta Hawks": "Atlanta Hawks",
  "Baltimore Bullets": "Washington Wizards",
  "Boston Celtics": "Boston Celtics",
  "Brooklyn Nets": "Brooklyn Nets",
  "Buffalo Braves": "LA Clippers",
  "Capital Bullets": "Washington Wizards",
  "Charlotte Bobcats": "Charlotte Hornets",
  "Charlotte Hornets": "Charlotte Hornets",
  "Chicago Bulls": "Chicago Bulls",
  "Chicago Packers": "Washington Wizards",
  "Chicago Zephyrs": "Washington Wizards",
  "Cincinnati Royals": "Sacramento Kings",
  "Cleveland Cavaliers": "Cleveland Cavaliers",
  "Dallas Mavericks": "Dallas Mavericks",
  "Denver Nuggets": "Denver Nuggets",
  "Detroit Pistons": "Detroit Pistons",
  "Golden State Warriors": "Golden State Warriors",
  "Houston Rockets": "Houston Rockets",
  "Indiana Pacers": "Indiana Pacers",
  "Kansas City Kings": "Sacramento Kings",
  "Kansas City-Omaha Kings": "Sacramento Kings",
  "Kansas City–Omaha Kings": "Sacramento Kings",
  "LA Clippers": "LA Clippers",
  "Los Angeles Clippers": "LA Clippers",
  "Los Angeles Laker": "Los Angeles Lakers",
  "Los Angeles Lakers": "Los Angeles Lakers",
  "Memphis Grizzlies": "Memphis Grizzlies",
  "Miami Heat": "Miami Heat",
  "Milwaukee Bucks": "Milwaukee Bucks",
  "Minneapolis Lakers": "Los Angeles Lakers",
  "Minnesota Timberwolves": "Minnesota Timberwolves",
  "New Jersey Nets": "Brooklyn Nets",
  "New Orleans": "New Orleans Pelicans",
  "New Orleans Hornets": "New Orleans Pelicans",
  "New Orleans Jazz": "Utah Jazz",
  "New Orleans Pelicans": "New Orleans Pelicans",
  "New Orleans/Oklahoma City Hornets": "New Orleans Pelicans",
  "New York Knicks": "New York Knicks",
  "New York Nets": "Brooklyn Nets",
  "Oklahoma City Thunder": "Oklahoma City Thunder",
  "Orlando Magic": "Orlando Magic",
  "Philadelphia 76ers": "Philadelphia 76ers",
  "Philadelphia Warriors": "Golden State Warriors",
  "Phoenix Suns": "Phoenix Suns",
  "Portland Trail Blazers": "Portland Trail Blazers",
  "Sacramento Kings": "Sacramento Kings",
  "San Antonio Spurs": "San Antonio Spurs",
  "San Diego Clippers": "LA Clippers",
  "San Diego Rockets": "Houston Rockets",
  "San Francisco Warriors": "Golden State Warriors",
  "Seattle SuperSonics": "Oklahoma City Thunder",
  "St. Louis Hawks": "Atlanta Hawks",
  "Syracuse Nationals": "Philadelphia 76ers",
  "Toronto Raptors": "Toronto Raptors",
  "Utah Jazz": "Utah Jazz",
  "Vancouver Grizzlies": "Memphis Grizzlies",
  "Washington Bullets": "Washington Wizards",
  "Washington Wizards": "Washington Wizards",
};

export function normalizeDraftTeamName(raw: string): string {
  return raw
    .replace(/\*+/g, "")
    .replace(/\s+traded to\b.*$/i, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function draftTeamLogoFranchise(teamName: string): string {
  const normalized = normalizeDraftTeamName(teamName);
  return DRAFT_TEAM_LOGO_ALIASES[normalized] ?? normalized;
}
