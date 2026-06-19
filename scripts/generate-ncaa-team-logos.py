#!/usr/bin/env python3
"""Regenerate client/src/lib/ncaa-team-logos.ts from ESPN's NCAA team list."""

from __future__ import annotations

import json
import re
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "client/src/lib/ncaa-team-logos.ts"
MANUAL_ALIASES_PATH = ROOT / "scripts/ncaa-manual-aliases.json"
ESPN_URL = (
    "https://site.api.espn.com/apis/site/v2/sports/basketball/"
    "mens-college-basketball/teams?limit=500"
)


def slugify(value: str) -> str:
    normalized = value.replace("'", "").replace(".", "").strip().lower()
    slug = re.sub(r"[^a-z0-9]+", "-", normalized)
    return slug.strip("-")


def normalize_name(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower().replace("'", "").replace(".", ""))


def school_slug(full_slug: str) -> str | None:
    parts = [part for part in full_slug.split("-") if part]
    if len(parts) <= 1:
        return None
    return "-".join(parts[:-1])


def fmt_record(record: dict[str, str]) -> str:
    return "\n".join(f'  "{key}": "{value}",' for key, value in sorted(record.items()))


def add_slug_alias(by_slug: dict[str, str], alias: str | None, espn_id: str) -> None:
    if not alias:
        return
    cleaned = alias.strip().lower()
    if cleaned:
        by_slug[cleaned] = espn_id


def add_name_alias(by_name: dict[str, str], alias: str | None, espn_id: str) -> None:
    if not alias:
        return
    cleaned = alias.strip()
    if cleaned:
        by_name[cleaned] = espn_id
        normalized = normalize_name(cleaned)
        if normalized:
            by_name[normalized] = espn_id


def load_manual_aliases() -> dict[str, str]:
    if not MANUAL_ALIASES_PATH.exists():
        return {}
    return json.loads(MANUAL_ALIASES_PATH.read_text(encoding="utf-8"))


def main() -> None:
    with urllib.request.urlopen(ESPN_URL) as response:
        data = json.load(response)

    manual_aliases = load_manual_aliases()
    teams = data["sports"][0]["leagues"][0]["teams"]
    by_slug: dict[str, str] = {}
    by_name: dict[str, str] = {}
    by_abbrev: dict[str, str] = {}
    display_name_by_id: dict[str, str] = {}
    slug_to_canonical: dict[str, str] = {}

    for entry in teams:
        team = entry["team"]
        espn_id = team["id"]
        slug = team["slug"].strip().lower()
        display_name = team["displayName"].strip()
        short_name = team.get("shortDisplayName", "").strip()
        location = team.get("location", "").strip()
        nickname = team.get("nickname", "").strip()
        abbrev = team["abbreviation"].upper()

        display_name_by_id[espn_id] = display_name
        slug_to_canonical[slug] = slug

        for alias in (slug, school_slug(slug), slugify(display_name)):
            add_slug_alias(by_slug, alias, espn_id)

        for label in (display_name, short_name, location, nickname):
            add_name_alias(by_name, label, espn_id)
            add_slug_alias(by_slug, slugify(label), espn_id)

        by_abbrev[abbrev] = espn_id

    for alias, canonical_slug in manual_aliases.items():
        espn_id = by_slug.get(canonical_slug)
        if not espn_id:
            continue
        add_slug_alias(by_slug, alias, espn_id)
        add_slug_alias(by_slug, slugify(alias), espn_id)
        add_name_alias(by_name, alias, espn_id)

    content = f"""// Auto-generated from ESPN men's college basketball teams API.
// Regenerate with: python3 scripts/generate-ncaa-team-logos.py
// Generated: {date.today().isoformat()}

const NCAA_LOGO_FALLBACK =
  "https://upload.wikimedia.org/wikipedia/commons/d/dd/NCAA_logo.svg";

const ESPN_IDS_BY_SLUG: Record<string, string> = {{
{fmt_record(by_slug)}
}};

const ESPN_IDS_BY_NAME: Record<string, string> = {{
{fmt_record(by_name)}
}};

const ESPN_IDS_BY_ABBREV: Record<string, string> = {{
{fmt_record(by_abbrev)}
}};

const ESPN_DISPLAY_NAME_BY_ID: Record<string, string> = {{
{fmt_record(display_name_by_id)}
}};

function nameToSlug(name: string): string {{
  return name
    .trim()
    .toLowerCase()
    .replace(/[''.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}}

function normalizeTeamName(name: string): string {{
  return name
    .trim()
    .toLowerCase()
    .replace(/[''.]/g, "")
    .replace(/\\s+/g, " ");
}}

export function resolveNcaaEspnId(
  teamName: string,
  options?: {{ abbreviation?: string; slug?: string }},
): string | undefined {{
  const slug = options?.slug?.trim().toLowerCase();
  if (slug && ESPN_IDS_BY_SLUG[slug]) return ESPN_IDS_BY_SLUG[slug];

  const nameSlug = nameToSlug(teamName);
  if (nameSlug && ESPN_IDS_BY_SLUG[nameSlug]) return ESPN_IDS_BY_SLUG[nameSlug];

  if (ESPN_IDS_BY_NAME[teamName]) return ESPN_IDS_BY_NAME[teamName];

  const normalizedName = normalizeTeamName(teamName);
  if (normalizedName && ESPN_IDS_BY_NAME[normalizedName]) {{
    return ESPN_IDS_BY_NAME[normalizedName];
  }}

  const abbrev = options?.abbreviation?.trim().toUpperCase();
  if (abbrev && ESPN_IDS_BY_ABBREV[abbrev]) return ESPN_IDS_BY_ABBREV[abbrev];

  return undefined;
}}

export function resolveNcaaTeamDisplayName(
  teamName: string,
  options?: {{ abbreviation?: string; slug?: string }},
): string | undefined {{
  const espnId = resolveNcaaEspnId(teamName, options);
  if (!espnId) return undefined;
  return ESPN_DISPLAY_NAME_BY_ID[espnId];
}}

export function ncaaTeamLogoUrl(
  teamName: string,
  options?: {{ abbreviation?: string; slug?: string }},
): string {{
  const espnId = resolveNcaaEspnId(teamName, options);
  if (!espnId) return NCAA_LOGO_FALLBACK;
  return `https://a.espncdn.com/i/teamlogos/ncaa/500/${{espnId}}.png`;
}}
"""

    OUTPUT.write_text(content, encoding="utf-8")
    print(f"Wrote {len(teams)} teams to {OUTPUT}")


if __name__ == "__main__":
    main()
