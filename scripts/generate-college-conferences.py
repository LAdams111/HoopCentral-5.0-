#!/usr/bin/env python3
"""Generate client/src/lib/{league}-conferences.ts from current-team JSON + DB aliases."""

from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = Path(__file__).resolve().parent / "college-conference-sources"


def slugify(value: str) -> str:
    normalized = (
        value.replace("'", "")
        .replace(".", "")
        .replace("&", " and ")
        .strip()
        .lower()
    )
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


def school_aliases(school: str, nickname: str) -> tuple[set[str], set[str]]:
    slugs: set[str] = set()
    names: set[str] = set()

    add_alias(names, school)
    add_alias(slugs, school)

    if nickname:
        add_alias(names, nickname)
        add_alias(slugs, nickname)
        add_alias(names, f"{school} {nickname}")
        add_alias(slugs, f"{school} {nickname}")

    school_no_paren = re.sub(r"\s*\([^)]*\)", "", school).strip()
    if school_no_paren != school:
        add_alias(names, school_no_paren)
        add_alias(slugs, school_no_paren)

    for old, new in (
        ("St.", "Saint"),
        ("St ", "Saint "),
        (" - ", " "),
        ("University of ", ""),
    ):
        if old in school:
            variant = school.replace(old, new).strip()
            add_alias(names, variant)
            add_alias(slugs, variant)

    return slugs, names


def load_db_aliases(path: Path) -> tuple[dict[str, str], set[str]]:
    if not path.exists():
        return {}, set()
    payload = json.loads(path.read_text(encoding="utf-8"))
    aliases = {
        str(key).strip().lower(): str(value).strip().lower()
        for key, value in payload.get("aliases", {}).items()
    }
    current_slugs = {str(slug).strip().lower() for slug in payload.get("currentSlugs", [])}
    return aliases, current_slugs


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--league", required=True, help="League slug, e.g. ncaa-d3")
    parser.add_argument(
        "--source",
        help="Path to current-teams JSON (default: college-conference-sources/{league}-current-teams.json)",
    )
    parser.add_argument(
        "--aliases",
        help="Path to db-aliases JSON (default: college-conference-sources/{league}-db-aliases.json)",
    )
    parser.add_argument(
        "--display-names",
        help="Optional JSON map of conference slug -> display name",
    )
    parser.add_argument(
        "--require-current",
        action="store_true",
        default=True,
        help="Only map teams in currentSlugs / canonical list (default true)",
    )
    parser.add_argument(
        "--no-require-current",
        action="store_false",
        dest="require_current",
        help="Match all teams to conferences without a current-team gate",
    )
    args = parser.parse_args()

    league = args.league.strip().lower()
    source_path = Path(args.source) if args.source else SOURCES / f"{league}-current-teams.json"
    aliases_path = Path(args.aliases) if args.aliases else SOURCES / f"{league}-db-aliases.json"
    output_path = ROOT / "client/src/lib" / f"{league.replace('-', '-')}-conferences.ts"
    output_path = ROOT / "client" / "src" / "lib" / f"{league}-conferences.ts"

    display_names: dict[str, str] = {}
    if args.display_names:
        display_names = json.loads(Path(args.display_names).read_text(encoding="utf-8"))

    teams = json.loads(source_path.read_text(encoding="utf-8"))
    db_aliases, current_slugs = load_db_aliases(aliases_path)
    by_conference: dict[str, list[dict[str, str]]] = defaultdict(list)

    for team in teams:
        conference_slug = slugify(team["conference"])
        by_conference[conference_slug].append(team)

    conferences: list[dict[str, object]] = []
    school_to_conference: dict[str, str] = {}

    for conference_slug in sorted(by_conference.keys(), key=lambda slug: display_names.get(slug, slug)):
        members = by_conference[conference_slug]
        team_slugs: set[str] = set()
        team_names: set[str] = set()
        canonical_schools: list[str] = []

        for member in sorted(members, key=lambda row: row["school"].lower()):
            school = member["school"]
            nickname = member.get("nickname", "")
            canonical_schools.append(school)
            slugs, names = school_aliases(school, nickname)
            team_slugs.update(slugs)
            team_names.update(names)
            school_to_conference[slugify(school)] = conference_slug

        for alias, canonical in db_aliases.items():
            if school_to_conference.get(canonical) == conference_slug:
                add_alias(team_slugs, alias)
                add_alias(team_names, alias)

        display_name = display_names.get(conference_slug)
        if not display_name:
            display_name = members[0]["conference"] if members else conference_slug.replace("-", " ").title()

        conferences.append(
            {
                "slug": conference_slug,
                "name": display_name,
                "teamSlugs": sorted(team_slugs),
                "teamNames": sorted(team_names),
                "canonicalSchools": sorted(set(canonical_schools)),
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
    canonicalSchools: {fmt_string_list(conference["canonicalSchools"])},
  }}"""
        )

    school_map_lines = ",\n".join(
        f"  {js_string(school)}: {js_string(conference_slug)}"
        for school, conference_slug in sorted(school_to_conference.items())
    )

    alias_map_lines = ",\n".join(
        f"  {js_string(alias)}: {js_string(canonical)}"
        for alias, canonical in sorted(db_aliases.items())
    )

    current_slug_lines = ",\n".join(
        f"  {js_string(slug)}" for slug in sorted(current_slugs)
    )

    export_prefix = league.upper().replace("-", "_")
    require_current = "true" if args.require_current else "false"

    content = f"""// Auto-generated for {league} conference grouping.
// Source: {source_path.name}
// Regenerate: python3 scripts/generate-college-conferences.py --league {league}
// Generated: {date.today().isoformat()}

import {{
  createCollegeConferenceGrouper,
  type CollegeConferenceGroup,
  type CollegeConferenceMeta,
}} from "./college-conference-core";

export type {export_prefix}_ConferenceMeta = CollegeConferenceMeta;
export type {export_prefix}_ConferenceGroup<T> = CollegeConferenceGroup<T>;

const CONFERENCES: readonly CollegeConferenceMeta[] = [
{",".join(conference_blocks)},
] as const;

const CANONICAL_SCHOOL_TO_CONFERENCE: Record<string, string> = {{
{school_map_lines}
}};

const DB_ALIAS_TO_CANONICAL_SCHOOL: Record<string, string> = {{
{alias_map_lines}
}};

const CURRENT_TEAM_SLUGS = new Set<string>([
{current_slug_lines}
]);

const grouper = createCollegeConferenceGrouper({{
  conferences: CONFERENCES,
  canonicalSchoolToConference: CANONICAL_SCHOOL_TO_CONFERENCE,
  dbAliasToCanonicalSchool: DB_ALIAS_TO_CANONICAL_SCHOOL,
  currentTeamSlugs: CURRENT_TEAM_SLUGS,
  requireCurrentTeam: {require_current},
}});

export const {export_prefix}_CONFERENCES = CONFERENCES;
export const OTHER_{export_prefix}_CONFERENCE_SLUG = grouper.OTHER_SLUG;
export const conferenceFor{league.replace('-', '').title().replace('_', '')}Team = grouper.conferenceForTeam;
export const get{league.replace('-', '').title().replace('_', '')}Conference = grouper.getConference;
export const group{league.replace('-', '').title().replace('_', '')}TeamsByConference = grouper.groupTeamsByConference;
"""

    # Fix export function names - use simpler pattern
    pascal = "".join(part.capitalize() for part in league.split("-"))
    content = f"""// Auto-generated for {league} conference grouping.
// Source: {source_path.name}
// Regenerate: python3 scripts/generate-college-conferences.py --league {league}
// Generated: {date.today().isoformat()}

import {{
  createCollegeConferenceGrouper,
  type CollegeConferenceGroup,
  type CollegeConferenceMeta,
}} from "./college-conference-core";

export type {pascal}ConferenceMeta = CollegeConferenceMeta;
export type {pascal}ConferenceGroup<T> = CollegeConferenceGroup<T>;

const CONFERENCES: readonly CollegeConferenceMeta[] = [
{",".join(conference_blocks)},
] as const;

const CANONICAL_SCHOOL_TO_CONFERENCE: Record<string, string> = {{
{school_map_lines}
}};

const DB_ALIAS_TO_CANONICAL_SCHOOL: Record<string, string> = {{
{alias_map_lines}
}};

const CURRENT_TEAM_SLUGS = new Set<string>([
{current_slug_lines}
]);

const grouper = createCollegeConferenceGrouper({{
  conferences: CONFERENCES,
  canonicalSchoolToConference: CANONICAL_SCHOOL_TO_CONFERENCE,
  dbAliasToCanonicalSchool: DB_ALIAS_TO_CANONICAL_SCHOOL,
  currentTeamSlugs: CURRENT_TEAM_SLUGS,
  requireCurrentTeam: {require_current},
}});

export const {pascal.upper().replace('-', '_')}_CONFERENCES = CONFERENCES;
export const OTHER_{pascal.upper().replace('-', '_')}_CONFERENCE_SLUG = grouper.OTHER_SLUG;
export const conferenceFor{pascal}Team = grouper.conferenceForTeam;
export const get{pascal}Conference = grouper.getConference;
export const group{pascal}TeamsByConference = grouper.groupTeamsByConference;
"""

    output_path.write_text(content, encoding="utf-8")
    print(f"Wrote {len(conferences)} conferences ({len(teams)} teams) to {output_path}")


if __name__ == "__main__":
    main()
