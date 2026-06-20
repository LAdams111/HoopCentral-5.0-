import { nameToSlug } from "../utils/slug.js";

export const NBA_TEAMS = [
  { abbrev: "ATL", name: "Atlanta Hawks" },
  { abbrev: "BOS", name: "Boston Celtics" },
  { abbrev: "BKN", name: "Brooklyn Nets" },
  { abbrev: "CHA", name: "Charlotte Hornets" },
  { abbrev: "CHI", name: "Chicago Bulls" },
  { abbrev: "CLE", name: "Cleveland Cavaliers" },
  { abbrev: "DAL", name: "Dallas Mavericks" },
  { abbrev: "DEN", name: "Denver Nuggets" },
  { abbrev: "DET", name: "Detroit Pistons" },
  { abbrev: "GSW", name: "Golden State Warriors" },
  { abbrev: "HOU", name: "Houston Rockets" },
  { abbrev: "IND", name: "Indiana Pacers" },
  { abbrev: "LAC", name: "LA Clippers" },
  { abbrev: "LAL", name: "Los Angeles Lakers" },
  { abbrev: "MEM", name: "Memphis Grizzlies" },
  { abbrev: "MIA", name: "Miami Heat" },
  { abbrev: "MIL", name: "Milwaukee Bucks" },
  { abbrev: "MIN", name: "Minnesota Timberwolves" },
  { abbrev: "NOP", name: "New Orleans Pelicans" },
  { abbrev: "NYK", name: "New York Knicks" },
  { abbrev: "OKC", name: "Oklahoma City Thunder" },
  { abbrev: "ORL", name: "Orlando Magic" },
  { abbrev: "PHI", name: "Philadelphia 76ers" },
  { abbrev: "PHX", name: "Phoenix Suns" },
  { abbrev: "POR", name: "Portland Trail Blazers" },
  { abbrev: "SAC", name: "Sacramento Kings" },
  { abbrev: "SAS", name: "San Antonio Spurs" },
  { abbrev: "TOR", name: "Toronto Raptors" },
  { abbrev: "UTA", name: "Utah Jazz" },
  { abbrev: "WAS", name: "Washington Wizards" },
] as const;

export const NBA_TEAMS_WITH_SLUGS = NBA_TEAMS.map((team) => ({
  ...team,
  slug: nameToSlug(team.name),
}));

export const NBA_CURRENT_TEAM_SLUGS = new Set(
  NBA_TEAMS_WITH_SLUGS.map((team) => team.slug),
);
