import { rosterPath } from "./constants";
import type { TeamSummary } from "./api";

/** Map DB league slug to the public slug used on roster URLs. */
export function publicLeagueSlugForRoster(dbLeagueSlug: string): string {
  if (dbLeagueSlug === "ncaa") return "ncaa-m";
  return dbLeagueSlug;
}

export function teamRosterPath(team: TeamSummary): string {
  const leagueSlug = publicLeagueSlugForRoster(team.league.slug);
  return rosterPath(team.name, undefined, leagueSlug);
}
