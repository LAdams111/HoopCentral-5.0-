import { nameToSlug } from "../utils/slug.js";

/** The Basketball League (USA) franchises — used to filter public team listings. */
export const THE_BASKETBALL_LEAGUE_TEAMS = [
  { abbrev: "ALB", name: "Albany Patroons" },
  { abbrev: "CSK", name: "California Sea Kings" },
  { abbrev: "DET", name: "Detroit Hustle" },
  { abbrev: "ENI", name: "Enid Outlaws" },
  { abbrev: "GCL", name: "Gulf Coast Lions" },
  { abbrev: "KOK", name: "Kokomo Bobkats" },
  { abbrev: "LRL", name: "Little Rock Lightning" },
  { abbrev: "MEM", name: "Memphis Lions" },
  { abbrev: "RAL", name: "Raleigh Firebirds" },
  { abbrev: "REA", name: "Reading Rebels" },
  { abbrev: "SYR", name: "Syracuse Stallions" },
  { abbrev: "TBT", name: "Tampa Bay Titans" },
  { abbrev: "TSA", name: "Tri-State Admirals" },
  { abbrev: "VAN", name: "Vancouver Volcanoes" },
  { abbrev: "WCB", name: "West Coast Breeze" },
] as const;

export const THE_BASKETBALL_LEAGUE_TEAMS_WITH_SLUGS = THE_BASKETBALL_LEAGUE_TEAMS.map((team) => ({
  ...team,
  slug: nameToSlug(team.name),
}));

export const THE_BASKETBALL_LEAGUE_TEAM_SLUGS = new Set(
  THE_BASKETBALL_LEAGUE_TEAMS_WITH_SLUGS.map((team) => team.slug),
);
