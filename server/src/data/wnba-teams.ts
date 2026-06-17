import { nameToSlug } from "../utils/slug.js";

export const WNBA_TEAMS = [
  { abbrev: "ATL", name: "Atlanta Dream" },
  { abbrev: "CHI", name: "Chicago Sky" },
  { abbrev: "CON", name: "Connecticut Sun" },
  { abbrev: "DAL", name: "Dallas Wings" },
  { abbrev: "GSV", name: "Golden State Valkyries" },
  { abbrev: "IND", name: "Indiana Fever" },
  { abbrev: "LVA", name: "Las Vegas Aces" },
  { abbrev: "LAS", name: "Los Angeles Sparks" },
  { abbrev: "MIN", name: "Minnesota Lynx" },
  { abbrev: "NYL", name: "New York Liberty" },
  { abbrev: "PHO", name: "Phoenix Mercury" },
  { abbrev: "SEA", name: "Seattle Storm" },
  { abbrev: "WAS", name: "Washington Mystics" },
] as const;

export const WNBA_TEAMS_WITH_SLUGS = WNBA_TEAMS.map((team) => ({
  ...team,
  slug: nameToSlug(team.name),
}));

export const WNBA_CURRENT_TEAM_SLUGS = new Set(
  WNBA_TEAMS_WITH_SLUGS.map((team) => team.slug),
);
