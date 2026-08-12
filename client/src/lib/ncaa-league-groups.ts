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
import {
  getNcaaWConference,
  groupNcaaWTeamsByConference,
  OTHER_NCAA_W_CONFERENCE_SLUG,
  type NcaaWConferenceGroup,
} from "./ncaa-w-conferences";
import {
  getNcaaD3Conference,
  groupNcaaD3TeamsByConference,
  OTHER_NCAAD3_CONFERENCE_SLUG,
  type NcaaD3ConferenceGroup,
} from "./ncaa-d3-conferences";
import {
  getNaiaConference,
  groupNaiaTeamsByConference,
  OTHER_NAIA_CONFERENCE_SLUG,
  type NaiaConferenceGroup,
} from "./naia-conferences";
import {
  getJucoConference,
  groupJucoTeamsByConference,
  OTHER_JUCO_CONFERENCE_SLUG,
  type JucoConferenceGroup,
} from "./juco-conferences";
import {
  getCcaaConference,
  groupCcaaTeamsByConference,
  OTHER_CCAA_CONFERENCE_SLUG,
  type CcaaConferenceGroup,
} from "./ccaa-conferences";
import {
  getUSportsConference,
  groupUSportsTeamsByConference,
  OTHER_USPORTS_CONFERENCE_SLUG,
  type USportsConferenceGroup,
} from "./u-sports-conferences";

export type NcaaGroupedLeagueSlug =
  | "ncaa-m"
  | "ncaa-w"
  | "ncaa-d2"
  | "ncaa-d3"
  | "naia"
  | "juco"
  | "ccaa"
  | "u-sports";

const NCAA_LEAGUE_SLUGS = new Set([
  "ncaa",
  "ncaa-m",
  "ncaa-w",
  "ncaa-d2",
  "ncaa-d3",
  "naia",
  "juco",
  "ccaa",
  "u-sports",
]);

const GROUPED_LEAGUE_SLUGS = new Set<string>([
  "ncaa-m",
  "ncaa-w",
  "ncaa-d2",
  "ncaa-d3",
  "naia",
  "juco",
  "ccaa",
  "u-sports",
]);

export function isNcaaLeagueSlug(leagueSlug?: string): boolean {
  if (!leagueSlug) return false;
  return NCAA_LEAGUE_SLUGS.has(leagueSlug.trim().toLowerCase());
}

export function isNcaaGroupedLeague(slug: string): slug is NcaaGroupedLeagueSlug {
  return GROUPED_LEAGUE_SLUGS.has(slug.trim().toLowerCase());
}

export type NcaaConferenceGroupView<T> =
  | NcaaConferenceGroup<T>
  | NcaaD2ConferenceGroup<T>
  | NcaaD3ConferenceGroup<T>
  | NcaaWConferenceGroup<T>
  | NaiaConferenceGroup<T>
  | JucoConferenceGroup<T>
  | CcaaConferenceGroup<T>
  | USportsConferenceGroup<T>;

export function groupNcaaLeagueTeams<T extends { name: string; abbreviation: string; slug: string }>(
  leagueSlug: NcaaGroupedLeagueSlug,
  teams: T[],
): NcaaConferenceGroupView<T>[] {
  switch (leagueSlug) {
    case "ncaa-m":
      return groupNcaaTeamsByConference(teams);
    case "ncaa-d2":
      return groupNcaaD2TeamsByConference(teams);
    case "ncaa-d3":
      return groupNcaaD3TeamsByConference(teams);
    case "ncaa-w":
      return groupNcaaWTeamsByConference(teams);
    case "naia":
      return groupNaiaTeamsByConference(teams);
    case "juco":
      return groupJucoTeamsByConference(teams);
    case "ccaa":
      return groupCcaaTeamsByConference(teams);
    case "u-sports":
      return groupUSportsTeamsByConference(teams);
    default:
      return [];
  }
}

export function getNcaaLeagueConference(
  leagueSlug: NcaaGroupedLeagueSlug,
  conferenceSlug: string,
): { slug: string; name: string } | undefined {
  switch (leagueSlug) {
    case "ncaa-m":
      return getNcaaConference(conferenceSlug);
    case "ncaa-d2":
      return getNcaaD2Conference(conferenceSlug);
    case "ncaa-d3":
      return getNcaaD3Conference(conferenceSlug);
    case "ncaa-w":
      return getNcaaWConference(conferenceSlug);
    case "naia":
      return getNaiaConference(conferenceSlug);
    case "juco":
      return getJucoConference(conferenceSlug);
    case "ccaa":
      return getCcaaConference(conferenceSlug);
    case "u-sports":
      return getUSportsConference(conferenceSlug);
    default:
      return undefined;
  }
}

export function isOtherNcaaConference(
  leagueSlug: NcaaGroupedLeagueSlug,
  conferenceSlug: string,
): boolean {
  switch (leagueSlug) {
    case "ncaa-m":
      return conferenceSlug === OTHER_NCAA_M_CONFERENCE_SLUG;
    case "ncaa-d2":
      return conferenceSlug === OTHER_NCAA_D2_CONFERENCE_SLUG;
    case "ncaa-d3":
      return conferenceSlug === OTHER_NCAAD3_CONFERENCE_SLUG;
    case "ncaa-w":
      return conferenceSlug === OTHER_NCAA_W_CONFERENCE_SLUG;
    case "naia":
      return conferenceSlug === OTHER_NAIA_CONFERENCE_SLUG;
    case "juco":
      return conferenceSlug === OTHER_JUCO_CONFERENCE_SLUG;
    case "ccaa":
      return conferenceSlug === OTHER_CCAA_CONFERENCE_SLUG;
    case "u-sports":
      return conferenceSlug === OTHER_USPORTS_CONFERENCE_SLUG;
    default:
      return false;
  }
}
