#!/usr/bin/env python3
"""Regenerate client/src/lib/ncaa-w-conferences.ts from ESPN women's D1 standings."""

from __future__ import annotations

import json
import re
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "client/src/lib/ncaa-w-conferences.ts"
STANDINGS_URL = (
    "https://site.api.espn.com/apis/v2/sports/basketball/"
    "womens-college-basketball/standings"
)
TEAMS_URL = (
    "https://site.api.espn.com/apis/site/v2/sports/basketball/"
    "womens-college-basketball/teams?limit=500"
)


def slugify(value: str) -> str:
    normalized = value.replace("'", "").replace(".", "").strip().lower()
    slug = re.sub(r"[^a-z0-9]+", "-", normalized)
    return slug.strip("-")


def js_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=True)


def fmt_string_list(values: list[str]) -> str:
    if not values:
        return "[]"
    lines = ",\n".join(f"    {js_string(value)}" for value in values)
    return f"[\n{lines},\n  ]"


def add_alias(aliases: set[str], value: str | None) -> None:
    if not value:
        return
    cleaned = value.strip()
    if not cleaned:
        return
    aliases.add(cleaned)
    slug = slugify(cleaned)
    if slug:
        aliases.add(slug)


def fetch_json(url: str) -> dict:
    with urllib.request.urlopen(url) as response:
        return json.load(response)


def main() -> None:
    standings = fetch_json(STANDINGS_URL)
    teams_data = fetch_json(TEAMS_URL)
    teams_by_id: dict[str, dict] = {}
    for entry in teams_data["sports"][0]["leagues"][0]["teams"]:
        team = entry["team"]
        teams_by_id[team["id"]] = team

    conferences: list[dict[str, object]] = []
    espn_id_to_conference: dict[str, str] = {}

    for group in standings.get("children", []):
        name = group.get("name", "").strip()
        if not name or name == "College Basketball Crown":
            continue

        conference_slug = slugify(name)
        team_slugs: set[str] = set()
        team_names: set[str] = set()
        team_abbrevs: set[str] = set()
        team_espn_ids: set[str] = set()

        for entry in group.get("standings", {}).get("entries", []):
            team = entry.get("team", {})
            espn_id = str(team.get("id", "")).strip()
            if not espn_id:
                continue

            team_espn_ids.add(espn_id)
            espn_id_to_conference[espn_id] = conference_slug

            full_team = teams_by_id.get(espn_id, {})
            display_name = full_team.get("displayName") or team.get("displayName") or team.get("name", "")
            short_name = full_team.get("shortDisplayName") or team.get("shortDisplayName") or display_name
            abbrev = full_team.get("abbreviation") or team.get("abbreviation") or ""

            add_alias(team_names, display_name)
            add_alias(team_names, short_name)
            add_alias(team_slugs, slugify(display_name))
            add_alias(team_slugs, slugify(short_name))
            if abbrev:
                add_alias(team_abbrevs, abbrev)
                add_alias(team_slugs, slugify(abbrev))

        conferences.append(
            {
                "slug": conference_slug,
                "name": name,
                "teamSlugs": sorted(team_slugs),
                "teamNames": sorted(team_names),
                "teamAbbrevs": sorted(team_abbrevs),
                "espnIds": sorted(team_espn_ids),
            }
        )

    conference_blocks = []
    for conference in conferences:
        conference_blocks.append(
            f"""  {{
    slug: {js_string(conference["slug"])},
    name: {js_string(conference["name"])},
    teamSlugs: {fmt_string_list(conference["teamSlugs"])},
    teamNames: {fmt_string_list(conference["teamNames"])},
    teamAbbrevs: {fmt_string_list(conference["teamAbbrevs"])},
    espnIds: {fmt_string_list(conference["espnIds"])},
  }}"""
        )

    espn_map_lines = ",\n".join(
        f"  {js_string(espn_id)}: {js_string(conference_slug)}"
        for espn_id, conference_slug in sorted(espn_id_to_conference.items())
    )

    content = f"""// Auto-generated from ESPN women's D1 standings.
// Regenerate: python3 scripts/generate-ncaa-w-conferences.py
// Generated: {date.today().isoformat()}

import {{
  createCollegeConferenceGrouper,
  type CollegeConferenceGroup,
  type CollegeConferenceMeta,
}} from "./college-conference-core";

export interface NcaaWConferenceMeta extends CollegeConferenceMeta {{
  teamAbbrevs: readonly string[];
  espnIds: readonly string[];
}}

export type NcaaWConferenceGroup<T> = CollegeConferenceGroup<T>;

const CONFERENCES: readonly NcaaWConferenceMeta[] = [
{",".join(conference_blocks)},
] as const;

const ESPN_ID_TO_CONFERENCE: Record<string, string> = {{
{espn_map_lines}
}};

function nameToSlug(name: string): string {{
  return name
    .trim()
    .toLowerCase()
    .replace(/[''.]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}}

function normalizeName(name: string): string {{
  return name
    .trim()
    .toLowerCase()
    .replace(/[''.]/g, "")
    .replace(/&/g, " and ")
    .replace(/\\s+/g, " ");
}}

function teamMatchesConference(
  team: {{ name: string; abbreviation: string; slug: string }},
  conference: NcaaWConferenceMeta,
): boolean {{
  const slug = team.slug.trim().toLowerCase();
  const nameSlug = nameToSlug(team.name);
  const normalizedTeamName = normalizeName(team.name);
  const abbrev = team.abbreviation.trim().toLowerCase();

  for (const conferenceSlug of conference.teamSlugs) {{
    if (slug && slug === conferenceSlug) return true;
    if (nameSlug && nameSlug === conferenceSlug) return true;
  }}

  for (const conferenceName of conference.teamNames) {{
    const normalizedConferenceName = normalizeName(conferenceName);
    if (normalizedConferenceName === normalizedTeamName) return true;
    if (normalizedConferenceName.startsWith(`${{normalizedTeamName}} `)) return true;
    if (normalizedTeamName.startsWith(`${{normalizedConferenceName}} `)) return true;
  }}

  for (const conferenceAbbrev of conference.teamAbbrevs) {{
    if (abbrev && abbrev === conferenceAbbrev.trim().toLowerCase()) return true;
  }}

  return false;
}}

function conferenceForNcaaWTeam(team: {{ name: string; abbreviation: string; slug: string }}): string {{
  for (const conference of CONFERENCES) {{
    if (teamMatchesConference(team, conference)) return conference.slug;
  }}
  return OTHER_NCAA_W_CONFERENCE_SLUG;
}}

export const NCAA_W_CONFERENCES = CONFERENCES;
export const OTHER_NCAA_W_CONFERENCE_SLUG = "other";

export function getNcaaWConference(slug: string): NcaaWConferenceMeta | undefined {{
  return CONFERENCES.find((conference) => conference.slug === slug);
}}

export function groupNcaaWTeamsByConference<T extends {{ name: string; abbreviation: string; slug: string }}>(
  teams: T[],
): NcaaWConferenceGroup<T>[] {{
  const buckets = new Map<string, T[]>();
  for (const team of teams) {{
    const slug = conferenceForNcaaWTeam(team);
    const list = buckets.get(slug) ?? [];
    list.push(team);
    buckets.set(slug, list);
  }}

  const groups = CONFERENCES.map((conference) => ({{
    conference,
    teams: (buckets.get(conference.slug) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
  }})).filter((group) => group.teams.length > 0);

  const otherTeams = buckets.get(OTHER_NCAA_W_CONFERENCE_SLUG) ?? [];
  if (otherTeams.length > 0) {{
    groups.push({{
      conference: {{ slug: OTHER_NCAA_W_CONFERENCE_SLUG, name: "Other" }},
      teams: otherTeams.sort((a, b) => a.name.localeCompare(b.name)),
    }});
  }}

  return groups;
}}
"""

    OUTPUT.write_text(content, encoding="utf-8")
    print(f"Wrote {len(conferences)} conferences to {OUTPUT}")


if __name__ == "__main__":
    main()
