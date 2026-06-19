#!/usr/bin/env python3
"""Regenerate client/src/lib/ncaa-conferences.ts from ESPN conference groups."""

from __future__ import annotations

import json
import re
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "client/src/lib/ncaa-conferences.ts"
ESPN_URL = (
    "https://site.api.espn.com/apis/site/v2/sports/basketball/"
    "mens-college-basketball/groups"
)


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.strip().lower())
    return slug.strip("-")


def js_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=True)


def fmt_string_list(values: list[str]) -> str:
    if not values:
        return "[]"
    lines = ",\n".join(f"    {js_string(value)}" for value in values)
    return f"[\n{lines},\n  ]"


def main() -> None:
    with urllib.request.urlopen(ESPN_URL) as response:
        data = json.load(response)

    division_one = next(
        (group for group in data.get("groups", []) if group.get("name") == "NCAA Division I"),
        None,
    )
    if not division_one:
        raise SystemExit("Could not find NCAA Division I group in ESPN response")

    conferences: list[dict[str, object]] = []
    for group in division_one.get("children", []):
        name = group.get("name", "").strip()
        if not name:
            continue

        team_slugs: list[str] = []
        team_names: list[str] = []
        team_abbrevs: list[str] = []

        for team in group.get("teams", []):
            slug = team.get("slug", "").strip().lower()
            display_name = team.get("displayName", "").strip()
            abbrev = team.get("abbreviation", "").strip().upper()

            if slug:
                team_slugs.append(slug)
            if display_name:
                team_names.append(display_name)
                name_slug = slugify(display_name)
                if name_slug and name_slug not in team_slugs:
                    team_slugs.append(name_slug)
            if abbrev:
                team_abbrevs.append(abbrev)

        conferences.append(
            {
                "slug": slugify(name),
                "name": name,
                "teamSlugs": sorted(set(team_slugs)),
                "teamNames": sorted(set(team_names)),
                "teamAbbrevs": sorted(set(team_abbrevs)),
            }
        )

    conferences.sort(key=lambda item: str(item["name"]))

    conference_blocks = []
    for conference in conferences:
        conference_blocks.append(
            f"""  {{
    slug: {js_string(conference["slug"])},
    name: {js_string(conference["name"])},
    teamSlugs: {fmt_string_list(conference["teamSlugs"])},
    teamNames: {fmt_string_list(conference["teamNames"])},
    teamAbbrevs: {fmt_string_list(conference["teamAbbrevs"])},
  }}"""
        )

    joined_conferences = ",\n".join(conference_blocks)

    content = f"""// Auto-generated from ESPN men's college basketball conference groups.
// Regenerate with: python3 scripts/generate-ncaa-conferences.py
// Generated: {date.today().isoformat()}

export interface NcaaConferenceMeta {{
  slug: string;
  name: string;
  teamSlugs: readonly string[];
  teamNames: readonly string[];
  teamAbbrevs: readonly string[];
}}

export const NCAA_M_CONFERENCES: readonly NcaaConferenceMeta[] = [
{joined_conferences},
] as const;

export const OTHER_NCAA_M_CONFERENCE_SLUG = "other";

function nameToSlug(name: string): string {{
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}}

function teamMatchesConference(
  team: {{ name: string; abbreviation: string; slug: string }},
  conference: NcaaConferenceMeta,
): boolean {{
  const slug = team.slug.trim().toLowerCase();
  const nameSlug = nameToSlug(team.name);
  const abbrev = team.abbreviation.trim().toUpperCase();

  if (conference.teamSlugs.includes(slug)) return true;
  if (nameSlug && conference.teamSlugs.includes(nameSlug)) return true;
  if (conference.teamNames.includes(team.name)) return true;
  if (abbrev && conference.teamAbbrevs.includes(abbrev)) return true;
  return false;
}}

export function conferenceForNcaaTeam(
  team: {{ name: string; abbreviation: string; slug: string }},
): string {{
  for (const conference of NCAA_M_CONFERENCES) {{
    if (teamMatchesConference(team, conference)) {{
      return conference.slug;
    }}
  }}
  return OTHER_NCAA_M_CONFERENCE_SLUG;
}}

export function getNcaaConference(slug: string): NcaaConferenceMeta | undefined {{
  return NCAA_M_CONFERENCES.find((conference) => conference.slug === slug);
}}

export interface NcaaConferenceGroup<T> {{
  conference: NcaaConferenceMeta | {{ slug: string; name: string }};
  teams: T[];
}}

export function groupNcaaTeamsByConference<T extends {{ name: string; abbreviation: string; slug: string }}>(
  teams: T[],
): NcaaConferenceGroup<T>[] {{
  const buckets = new Map<string, T[]>();

  for (const team of teams) {{
    const conferenceSlug = conferenceForNcaaTeam(team);
    const existing = buckets.get(conferenceSlug) ?? [];
    existing.push(team);
    buckets.set(conferenceSlug, existing);
  }}

  const groups: NcaaConferenceGroup<T>[] = NCAA_M_CONFERENCES.map((conference) => ({{
    conference,
    teams: (buckets.get(conference.slug) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
  }})).filter((group) => group.teams.length > 0);

  const otherTeams = buckets.get(OTHER_NCAA_M_CONFERENCE_SLUG) ?? [];
  if (otherTeams.length > 0) {{
    groups.push({{
      conference: {{ slug: OTHER_NCAA_M_CONFERENCE_SLUG, name: "Other" }},
      teams: otherTeams.sort((a, b) => a.name.localeCompare(b.name)),
    }});
  }}

  return groups;
}}
"""

    OUTPUT.write_text(content, encoding="utf-8")
    team_count = sum(len(group.get("teams", [])) for group in division_one.get("children", []))
    print(f"Wrote {len(conferences)} conferences ({team_count} ESPN teams) to {OUTPUT}")


if __name__ == "__main__":
    main()
