import { nameToSlug } from "../utils/slug.js";

/** Current NBA G League franchises (2025-26). */
export const G_LEAGUE_TEAMS = [
  { abbrev: "AUS", name: "Austin Spurs" },
  { abbrev: "CCG", name: "Capital City Go-Go" },
  { abbrev: "CLC", name: "Cleveland Charge" },
  { abbrev: "CVL", name: "Coachella Valley Lakers" },
  { abbrev: "CPS", name: "College Park Skyhawks" },
  { abbrev: "DEL", name: "Delaware Blue Coats" },
  { abbrev: "GRG", name: "Grand Rapids Gold" },
  { abbrev: "GBO", name: "Greensboro Swarm" },
  { abbrev: "IWA", name: "Iowa Wolves" },
  { abbrev: "LKS", name: "Laketown Squadron" },
  { abbrev: "LIN", name: "Long Island Nets" },
  { abbrev: "MNE", name: "Maine Celtics" },
  { abbrev: "MHU", name: "Memphis Hustle" },
  { abbrev: "MXC", name: "Mexico City Capitanes" },
  { abbrev: "MCC", name: "Motor City Cruise" },
  { abbrev: "NOB", name: "Noblesville Boom" },
  { abbrev: "OKL", name: "Oklahoma City Blue" },
  { abbrev: "OSC", name: "Osceola Magic" },
  { abbrev: "RAP", name: "Raptors 905" },
  { abbrev: "RGV", name: "Rio Grande Valley Vipers" },
  { abbrev: "RIP", name: "Rip City Remix" },
  { abbrev: "SLC", name: "Salt Lake City Stars" },
  { abbrev: "SDC", name: "San Diego Clippers" },
  { abbrev: "SCW", name: "Santa Cruz Warriors" },
  { abbrev: "SXF", name: "Sioux Falls Skyforce" },
  { abbrev: "STO", name: "Stockton Kings" },
  { abbrev: "TEX", name: "Texas Legends" },
  { abbrev: "VAL", name: "Valley Suns" },
  { abbrev: "WES", name: "Westchester Knicks" },
  { abbrev: "WCB", name: "Windy City Bulls" },
  { abbrev: "WIS", name: "Wisconsin Herd" },
] as const;

export const G_LEAGUE_TEAMS_WITH_SLUGS = G_LEAGUE_TEAMS.map((team) => ({
  ...team,
  slug: nameToSlug(team.name),
}));

export const G_LEAGUE_CURRENT_TEAM_SLUGS = new Set(
  G_LEAGUE_TEAMS_WITH_SLUGS.map((team) => team.slug),
);
