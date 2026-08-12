#!/usr/bin/env python3
"""Fetch NCAA D3 conference membership from Wikipedia conference pages."""

from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

OUTPUT = Path(__file__).resolve().parent / "college-conference-sources" / "ncaa-d3-current-teams.json"
USER_AGENT = "HoopCentralBot/1.0 (college-conference-data; contact@hoopcentral.app)"

# Basketball-focused D3 conferences (from NCAA Division III membership).
D3_CONFERENCES: list[tuple[str, str]] = [
    ("Allegheny Mountain Collegiate Conference", "Allegheny_Mountain_Collegiate_Conference"),
    ("American Rivers Conference", "American_Rivers_Conference"),
    ("American Southwest Conference", "American_Southwest_Conference"),
    ("Atlantic East Conference", "Atlantic_East_Conference"),
    ("Centennial Conference", "Centennial_Conference"),
    ("City University of New York Athletic Conference", "City_University_of_New_York_Athletic_Conference"),
    ("Coast to Coast Athletic Conference", "Coast_to_Coast_Athletic_Conference"),
    ("College Conference of Illinois and Wisconsin", "College_Conference_of_Illinois_and_Wisconsin"),
    ("Collegiate Conference of the South", "Collegiate_Conference_of_the_South"),
    ("Conference of New England", "Conference_of_New_England"),
    ("Empire 8", "Empire_8"),
    ("Great Northeast Athletic Conference", "Great_Northeast_Athletic_Conference"),
    ("Heartland Collegiate Athletic Conference", "Heartland_Collegiate_Athletic_Conference"),
    ("Landmark Conference", "Landmark_Conference"),
    ("Liberty League", "Liberty_League"),
    ("Little East Conference", "Little_East_Conference"),
    ("Massachusetts State Collegiate Athletic Conference", "Massachusetts_State_Collegiate_Athletic_Conference"),
    ("Michigan Intercollegiate Athletic Association", "Michigan_Intercollegiate_Athletic_Conference"),
    ("Middle Atlantic Conferences", "Middle_Atlantic_Conferences"),
    ("Midwest Conference", "Midwest_Conference"),
    ("Minnesota Intercollegiate Athletic Conference", "Minnesota_Intercollegiate_Athletic_Conference"),
    ("New England Small College Athletic Conference", "New_England_Small_College_Athletic_Conference"),
    ("New England Women's and Men's Athletic Conference", "New_England_Women%27s_and_Men%27s_Athletic_Conference"),
    ("New Jersey Athletic Conference", "New_Jersey_Athletic_Conference"),
    ("North Atlantic Conference", "North_Atlantic_Conference"),
    ("North Coast Athletic Conference", "North_Coast_Athletic_Conference"),
    ("Northern Athletics Collegiate Conference", "Northern_Athletics_Collegiate_Conference"),
    ("Northwest Conference", "Northwest_Conference"),
    ("Ohio Athletic Conference", "Ohio_Athletic_Conference"),
    ("Old Dominion Athletic Conference", "Old_Dominion_Athletic_Conference"),
    ("Presidents' Athletic Conference", "Presidents%27_Athletic_Conference"),
    ("Skyline Conference", "Skyline_Conference"),
    ("Southern Athletic Association", "Southern_Athletic_Association"),
    ("Southern California Intercollegiate Athletic Conference", "Southern_California_Intercollegiate_Athletic_Conference"),
    ("Southern Collegiate Athletic Conference", "Southern_Collegiate_Athletic_Conference"),
    ("St. Louis Intercollegiate Athletic Conference", "St._Louis_Intercollegiate_Athletic_Conference"),
    ("State University of New York Athletic Conference", "State_University_of_New_York_Athletic_Conference"),
    ("USA South Athletic Conference", "USA_South_Athletic_Conference"),
    ("United East Conference", "United_East_Conference"),
    ("University Athletic Association", "University_Athletic_Association"),
    ("Upper Midwest Athletic Conference", "Upper_Midwest_Athletic_Conference"),
    ("Wisconsin Intercollegiate Athletic Conference", "Wisconsin_Intercollegiate_Athletic_Conference"),
]


def clean_wiki(value: str) -> str:
    value = re.sub(r"\{\{[^}]+\}\}", "", value)
    value = re.sub(r"\[\[([^|\]]+\|)?([^\]]+)\]\]", r"\2", value)
    value = re.sub(r"<[^>]+>", "", value)
    value = re.sub(r"''+", "", value)
    return re.sub(r"\s+", " ", value).strip()


def fetch_wikitext(page: str) -> str:
    params = urllib.parse.urlencode(
        {"action": "parse", "page": page, "prop": "wikitext", "format": "json"}
    )
    url = f"https://en.wikipedia.org/w/api.php?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.load(resp)
    if "error" in data:
        raise RuntimeError(data["error"])
    return data["parse"]["wikitext"]["*"]


def members_from_conference_page(text: str) -> list[tuple[str, str]]:
    section = text
    current = re.search(
        r"===Current members===(.*?)(?=\n===|\n==Affiliate|\n==Former|\Z)",
        text,
        re.S | re.I,
    )
    if current:
        section = current.group(1)

    members: list[tuple[str, str]] = []
    for block in re.split(r"\n\|-\n", section):
        if "Institution" in block and "Location" in block:
            continue
        school_match = re.search(r"\[\[([^|\]#]+)(?:\|[^\]]+)?\]\]", block)
        if not school_match:
            continue
        school = clean_wiki(school_match.group(1))
        if len(school) < 4:
            continue
        if any(
            skip in school.lower()
            for skip in ("conference", "color box", "cite web", "member schools")
        ):
            continue
        members.append((school, ""))
    return members


def main() -> None:
    teams: list[dict[str, str]] = []
    for conference_name, page in D3_CONFERENCES:
        try:
            text = fetch_wikitext(page)
        except Exception as exc:  # noqa: BLE001
            print(f"skip {conference_name}: {exc}")
            time.sleep(3)
            continue

        members = members_from_conference_page(text)
        for school, nickname in members:
            teams.append(
                {
                    "school": school,
                    "nickname": nickname,
                    "conference": conference_name,
                }
            )
        print(f"{conference_name}: {len(members)} members")
        time.sleep(2.5)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(teams, indent=2), encoding="utf-8")
    print(f"Wrote {len(teams)} teams to {OUTPUT}")


if __name__ == "__main__":
    main()
