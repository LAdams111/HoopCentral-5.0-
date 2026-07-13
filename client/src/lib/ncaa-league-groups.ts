import {
  getNcaaConference,
  groupNcaaTeamsByConference,
  OTHER_NCAA_M_CONFERENCE_SLUG,
  type NcaaConferenceGroup,
} from "./ncaa-conferences";
import {
  getNcaaD2Conference,
  groupNcaaD2TeamsByConference,
  OTHER_NCAA_D2_CONFERENCE_SLUG,
  type NcaaD2ConferenceGroup,
} from "./ncaa-d2-conferences";

export type NcaaGroupedLeagueSlug = "ncaa-m" | "ncaa-d2";

const NCAA_LEAGUE_SLUGS = new Set([
  "ncaa",
  "ncaa-m",
  "ncaa-w",
  "ncaa-d2",
]);

export function isNcaaLeagueSlug(leagueSlug?: string): boolean {
  if (!leagueSlug) return false;
  return NCAA_LEAGUE_SLUGS.has(leagueSlug.trim().toLowerCase());
}

export function isNcaaGroupedLeague(slug: string): slug is NcaaGroupedLeagueSlug {
  return slug === "ncaa-m" || slug === "ncaa-d2";
}

export type NcaaConferenceGroupView<T> = NcaaConferenceGroup<T> | NcaaD2ConferenceGroup<T>;

export function groupNcaaLeagueTeams<T extends { name: string; abbreviation: string; slug: string }>(
  leagueSlug: NcaaGroupedLeagueSlug,
  teams: T[],
): NcaaConferenceGroupView<T>[] {
  if (leagueSlug === "ncaa-m") return groupNcaaTeamsByConference(teams);
  return groupNcaaD2TeamsByConference(teams);
}

export function getNcaaLeagueConference(
  leagueSlug: NcaaGroupedLeagueSlug,
  conferenceSlug: string,
): { slug: string; name: string } | undefined {
  if (leagueSlug === "ncaa-m") {
    return getNcaaConference(conferenceSlug);
  }
  return getNcaaD2Conference(conferenceSlug);
}

export function isOtherNcaaConference(
  leagueSlug: NcaaGroupedLeagueSlug,
  conferenceSlug: string,
): boolean {
  if (leagueSlug === "ncaa-m") return conferenceSlug === OTHER_NCAA_M_CONFERENCE_SLUG;
  return conferenceSlug === OTHER_NCAA_D2_CONFERENCE_SLUG;
}
