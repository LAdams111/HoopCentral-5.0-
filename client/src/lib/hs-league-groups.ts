import {
  allHsStateSlugs,
  HS_OTHER_STATE_SLUG,
  HS_USA_REGION_SLUG,
  stateNameFromSlug,
  stateSlugFromTeamSlug,
} from "./hs-us-states";

export const HS_LEAGUE_SLUG = "high-school";

export interface HsStateGroup<T extends { slug: string }> {
  state: { slug: string; name: string };
  teams: T[];
}

export interface HsRegionGroup {
  region: { slug: string; name: string };
  teamCount: number;
}

export function isHighSchoolLeague(slug: string): boolean {
  return slug.trim().toLowerCase() === HS_LEAGUE_SLUG;
}

export function groupHighSchoolTeamsByState<T extends { slug: string }>(
  teams: T[],
): HsStateGroup<T>[] {
  const byState = new Map<string, T[]>();

  for (const slug of allHsStateSlugs()) {
    byState.set(slug, []);
  }

  for (const team of teams) {
    const stateSlug = stateSlugFromTeamSlug(team.slug);
    const bucket = byState.get(stateSlug) ?? byState.get(HS_OTHER_STATE_SLUG)!;
    bucket.push(team);
  }

  return allHsStateSlugs()
    .map((stateSlug) => ({
      state: { slug: stateSlug, name: stateNameFromSlug(stateSlug) },
      teams: byState.get(stateSlug) ?? [],
    }))
    .filter((group) => group.teams.length > 0);
}

export function getHighSchoolRegions(teamCount: number): HsRegionGroup[] {
  if (teamCount <= 0) return [];
  return [{ region: { slug: HS_USA_REGION_SLUG, name: "USA" }, teamCount }];
}

export function getHighSchoolRegion(slug: string): { slug: string; name: string } | undefined {
  if (slug.trim().toLowerCase() === HS_USA_REGION_SLUG) {
    return { slug: HS_USA_REGION_SLUG, name: "USA" };
  }
  return undefined;
}
