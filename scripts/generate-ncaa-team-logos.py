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
ESPN_URL = (
    "https://site.api.espn.com/apis/site/v2/sports/basketball/"
    "mens-college-basketball/teams?limit=500"
)


def name_to_slug(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower())
    return slug.strip("-")


def fmt_record(record: dict[str, str]) -> str:
    return "\n".join(f'  "{key}": "{value}",' for key, value in sorted(record.items()))


def main() -> None:
    with urllib.request.urlopen(ESPN_URL) as response:
        data = json.load(response)

    teams = data["sports"][0]["leagues"][0]["teams"]
    by_slug: dict[str, str] = {}
    by_name: dict[str, str] = {}
    by_abbrev: dict[str, str] = {}

    for entry in teams:
        team = entry["team"]
        espn_id = team["id"]
        slug = team["slug"]
        display_name = team["displayName"]
        abbrev = team["abbreviation"].upper()
        computed_slug = name_to_slug(display_name)

        for key in {slug, computed_slug}:
            by_slug[key] = espn_id
        by_name[display_name] = espn_id
        by_abbrev[abbrev] = espn_id

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

function nameToSlug(name: string): string {{
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}}

export function resolveNcaaEspnId(
  teamName: string,
  options?: {{ abbreviation?: string; slug?: string }},
): string | undefined {{
  const slug = options?.slug?.trim().toLowerCase();
  if (slug && ESPN_IDS_BY_SLUG[slug]) return ESPN_IDS_BY_SLUG[slug];

  const nameSlug = nameToSlug(teamName);
  if (ESPN_IDS_BY_SLUG[nameSlug]) return ESPN_IDS_BY_SLUG[nameSlug];

  if (ESPN_IDS_BY_NAME[teamName]) return ESPN_IDS_BY_NAME[teamName];

  const abbrev = options?.abbreviation?.trim().toUpperCase();
  if (abbrev && ESPN_IDS_BY_ABBREV[abbrev]) return ESPN_IDS_BY_ABBREV[abbrev];

  return undefined;
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
