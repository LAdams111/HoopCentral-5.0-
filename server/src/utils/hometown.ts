/** Shared hometown validation — team/college names are not birth cities. */

const SUFFIX_RE = /\b(jr|sr|ii|iii|iv|v)\b/g;

/** Normalize for cross-profile name matching (RJ Barrett ≈ R.J. Barrett Jr.). */
export function hometownNameKey(displayName: string): string {
  return displayName
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(SUFFIX_RE, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isPlausibleHometown(value: string | null | undefined): boolean {
  const hometown = value?.trim();
  if (!hometown || hometown.length > 80) return false;
  if (/\*{2,}/.test(hometown)) return false;
  if (/full name|year-by-year|starting five|\bgames:/i.test(hometown)) return false;
  if (!/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(hometown)) return false;
  return true;
}

/** Looks like a real city/region, not a team or school abbreviation. */
export function isLikelyRealHometown(
  hometown: string | null | undefined,
  teamNames: readonly string[] = [],
): boolean {
  if (!isPlausibleHometown(hometown)) return false;
  const h = hometown!.trim();
  if (isMaxprepsSchoolLabelHometown(h)) return false;
  if (isTeamNameHometown(h, teamNames)) return false;

  if (REAL_CITY_ALLOWLIST.has(h.toLowerCase())) return true;

  if (h.includes(",")) return true;
  if (/\([^)]+\)/.test(h)) return true;
  if (/\b(ON|BC|AB|MB|SK|QC|NS|NB|PE|NL|YT|NT|NU)\b/i.test(h)) return true;

  return false;
}

export function isTeamNameHometown(
  hometown: string,
  teamNames: readonly string[],
): boolean {
  const h = hometown.trim().toLowerCase();
  if (!h) return false;

  // "Glendale, AZ" — city/state even if a junk team row reused the label.
  if (/,/.test(hometown)) {
    const statePart = (hometown.split(",")[1] ?? "").trim();
    if (/^[a-z]{2}$/i.test(statePart) || /^[a-z]{2,}$/i.test(statePart)) {
      return false;
    }
  }

  for (const teamName of teamNames) {
    const t = teamName.trim().toLowerCase();
    if (!t) continue;

    if (h === t) return true;

    const firstWord = t.split(/\s+/)[0] ?? "";
    // "Boston" + "Boston Celtics" — keep; city allowlist protects real hometowns.
    if (
      h === firstWord &&
      firstWord.length >= 3 &&
      !h.includes(",") &&
      !REAL_CITY_ALLOWLIST.has(h)
    ) {
      return true;
    }

    // Partial match — franchise names like "Metropolitans 92", not cities like "Le Mans".
    if (
      !h.includes(",") &&
      h.length >= 10 &&
      (t.includes(h) || h.includes(t)) &&
      t.length - h.length <= 20
    ) {
      return true;
    }
  }

  return false;
}

export function pickBetterHometown(
  a: string | null | undefined,
  b: string | null | undefined,
  teamNames: readonly string[] = [],
): string | null {
  const aTrim = a?.trim() ?? "";
  const bTrim = b?.trim() ?? "";
  const aGood = isLikelyRealHometown(aTrim, teamNames);
  const bGood = isLikelyRealHometown(bTrim, teamNames);

  if (aGood && !bGood) return aTrim;
  if (bGood && !aGood) return bTrim;
  if (aGood && bGood) return aTrim.length >= bTrim.length ? aTrim : bTrim;
  if (aTrim && !bTrim) return aTrim;
  if (bTrim && !aTrim) return bTrim;
  return null;
}

/** Drop college/team labels before persisting ingest hometown (blocklist still applies). */
export function sanitizeIngestHometown(
  hometown: string | null | undefined,
  teamNames: readonly string[] = [],
): string | null {
  const trimmed = hometown?.trim();
  if (!trimmed) return null;
  if (!isPlausibleHometown(trimmed)) return null;
  if (isCollegeLikeHometown(trimmed, teamNames)) return null;
  if (isTeamNameHometown(trimmed, teamNames)) return null;
  return trimmed;
}

/** Manual overrides when no duplicate profile has the real birthplace. */
export const KNOWN_HOMETOWNS: Readonly<Record<number, string>> = {
  22: "Le Chesnay, France",
  3801: "Mississauga, ON",
  20: "Akron, OH",
  19: "Akron, OH",
  4135: "Newport, RI",
};

/** balldontlie external_id → real hometown (from seed / reference data). */
export const KNOWN_HOMETOWNS_BY_BDL_ID: Readonly<Record<string, string>> = {
  "201939": "Akron, OH",
  "2544": "Akron, OH",
  "203999": "Sombor, Serbia",
  "1641705": "Le Chesnay, France",
  "1057262088": "Newport, RI",
};

/** Major cities — also team names, but valid hometowns. Never flag on first-word team match alone. */
const REAL_CITY_ALLOWLIST = new Set(
  [
    "Boston",
    "Houston",
    "Chicago",
    "Atlanta",
    "Miami",
    "Dallas",
    "Denver",
    "Phoenix",
    "Seattle",
    "Portland",
    "Philadelphia",
    "Detroit",
    "Memphis",
    "New Orleans",
    "St. Louis",
    "San Antonio",
    "Cleveland",
    "Milwaukee",
    "Brooklyn",
    "Oakland",
    "Baltimore",
    "Washington",
    "Indianapolis",
    "Charlotte",
    "Sacramento",
    "Minneapolis",
    "Orlando",
    "Jacksonville",
    "Nashville",
    "Louisville",
    "Oklahoma City",
    "Kansas City",
    "Salt Lake City",
    "Las Vegas",
    "San Francisco",
    "San Diego",
    "San Jose",
    "Los Angeles",
    "Cincinnati",
    "Columbus",
    "Pittsburgh",
    "Buffalo",
    "Raleigh",
    "Richmond",
    "Norfolk",
    "Tucson",
    "Albuquerque",
    "Honolulu",
  ].map((s) => s.toLowerCase()),
);

/** Real cities/countries without a comma — do not treat as college names. */
const REAL_HOMETOWN_ALLOWLIST = new Set([
  "toronto",
  "paris",
  "london",
  "madrid",
  "barcelona",
  "rome",
  "milan",
  "athens",
  "tokyo",
  "beijing",
  "shanghai",
  "moscow",
  "warsaw",
  "zagreb",
  "split",
  "ljubljana",
  "belgrade",
  "bucharest",
  "istanbul",
  "tel aviv",
  "jerusalem",
  "cairo",
  "lagos",
  "accra",
  "dakar",
  "melbourne",
  "sydney",
  "brisbane",
  "perth",
  "auckland",
  "wellington",
  "montreal",
  "vancouver",
  "calgary",
  "edmonton",
  "ottawa",
  "winnipeg",
  "halifax",
  "rotorua",
  "levallois",
  "nanterre",
]);

/**
 * College / school names balldontlie incorrectly stores as hometown (no real city).
 * Built from production BDL NBA frequency analysis.
 */
export const COLLEGE_HOMETOWN_BLOCKLIST = new Set(
  [
    "Kentucky",
    "UCLA",
    "Kansas",
    "Michigan",
    "North Carolina",
    "Maryland",
    "Minnesota",
    "Southern California",
    "Indiana",
    "Duke",
    "St. John's (NY)",
    "Ohio State",
    "Louisville",
    "Notre Dame",
    "Oregon State",
    "Illinois",
    "Arizona",
    "Michigan State",
    "Villanova",
    "Marquette",
    "Providence",
    "Tennessee",
    "Arizona State",
    "Cincinnati",
    "Dayton",
    "Texas",
    "Arkansas",
    "Georgetown",
    "Iowa",
    "Oregon",
    "West Virginia",
    "DePaul",
    "Auburn",
    "Utah",
    "South Carolina",
    "Syracuse",
    "UNLV",
    "Gonzaga",
    "Virginia",
    "Wisconsin",
    "Purdue",
    "Baylor",
    "Alabama",
    "Nebraska",
    "Penn State",
    "Texas A&M",
    "Creighton",
    "Xavier",
    "Butler",
    "Seton Hall",
    "Connecticut",
    "UConn",
    "Davidson",
    "Wake Forest",
    "Clemson",
    "Georgia Tech",
    "Florida State",
    "Kansas State",
    "Iowa State",
    "Oklahoma State",
    "Texas Tech",
    "TCU",
    "SMU",
    "Wichita State",
    "San Diego State",
    "New Mexico",
    "Wyoming",
    "Boise State",
    "Colorado State",
    "Mississippi State",
    "LSU",
    "Missouri",
    "Vanderbilt",
    "Mississippi",
    "UCF",
    "BYU",
    "Nevada",
    "Fresno State",
    "Saint Mary's",
    "St. Mary's",
    "Pepperdine",
    "Loyola",
    "Bradley",
    "Drake",
    "Valparaiso",
    "Evansville",
    "Southern Methodist",
    "Texas Christian",
    "Northwestern",
    "Rutgers",
    "Temple",
    "Duquesne",
    "Virginia Commonwealth",
    "VCU",
    "George Washington",
    "George Mason",
    "Santa Clara",
    "Stanford",
    "California",
    "USC",
    "New Mexico State",
    "Utah State",
    "Montana",
    "Toledo",
    "Bowling Green",
    "Ball State",
    "Central Michigan",
    "Eastern Michigan",
    "Western Michigan",
    "Penn",
    "Yale",
    "Harvard",
    "Princeton",
    "Columbia",
    "Cornell",
    "Brown",
    "Dartmouth",
    "Metropolitans 92",
    "St. John's (NY)",
    "Western Kentucky",
    "Niagara",
    "La Salle",
    "Texas-El Paso",
    "Southern Illinois",
    "St. Bonaventure",
    "Grambling",
    "Brigham Young",
    "Holy Cross",
    "Guilford",
    "Miami (Ohio)",
    "Mega Basket",
    "Middle Tennessee",
    "East Tennessee State",
    "Weber State",
    "Murray State",
    "Morehead State",
    "Appalachian State",
    "Boise State",
    "Kent State",
    "Wright State",
    "Cleveland State",
    "Chicago State",
    "Norfolk State",
    "Morgan State",
    "Coppin State",
    "Delaware State",
    "Jackson State",
    "Alabama State",
    "Mississippi Valley State",
    "Texas Southern",
    "Southern University",
    "Alcorn State",
    "Prairie View",
    "Howard",
    "Hampton",
    "North Carolina A&T",
    "South Dakota State",
    "North Dakota State",
    "Portland State",
    "Sacramento State",
    "Long Beach State",
    "Cal State",
    "Pepperdine",
    "Loyola Marymount",
    "Pacific",
    "San Jose State",
    "Fresno State",
    "UC Irvine",
    "UC Santa Barbara",
    "UC Davis",
    "High Point",
    "Elon",
    "Charlotte",
    "Davidson",
    "Winthrop",
    "Radford",
    "Liberty",
    "Oral Roberts",
    "Tulsa",
    "Wofford",
    "Furman",
    "Chattanooga",
    "East Carolina",
    "Marshall",
    "Western Michigan",
    "Eastern Washington",
    "Montana State",
    "Idaho State",
    "Virtus Bologna",
    "Pennsylvania",
    "Kentucky Wesleyan",
    "Central Florida",
  ].map((s) => s.toLowerCase()),
);

const COUNTRY_PARENTHETICAL =
  /\((?:Australia|France|Spain|Croatia|Lithuania|Nigeria|Brazil|Germany|Italy|Serbia|Greece|Turkey|Israel|Canada|Mexico|Argentina|China|Japan|DR Congo|Congo|Senegal|Cameroon|Angola|Georgia|Latvia|Estonia|Poland|Czech Republic|Russia|Ukraine|Montenegro|Bosnia|Slovenia|Slovakia|Hungary|Romania|Bulgaria|Macedonia|Albania|Kosovo|Cyprus|Malta|Iceland|Norway|Sweden|Finland|Denmark|Netherlands|Belgium|Switzerland|Austria|Portugal|Ireland|Scotland|England|Wales|New Zealand|Philippines|Puerto Rico|Dominican Republic|Venezuela|Colombia|Peru|Chile|Uruguay|Paraguay|Ecuador|Panama|Jamaica|Bahamas|Haiti|Cuba|Morocco|Tunisia|Algeria|Egypt|South Africa|Ghana|Kenya|Sudan|Ethiopia|Uganda|Tanzania|Zimbabwe|Zambia|Angola|UK|USA|U\.S\.A\.|U\.S\. Virgin Islands|Virgin Islands)\)/i;

const COLLEGE_NAME_PATTERNS = [
  /\buniversity\b/i,
  /\bcollege\b/i,
  /\binstitute\b/i,
  /\btech\b/i,
  /\bstate\b/i,
  /^st\.?\s*john/i,
];

/** MaxPreps school label stored as hometown, e.g. "Notre Dame (SO) (Sherman Oaks, CA)". */
const MAXPREPS_SCHOOL_HOMETOWN =
  /^.+\([^)]+\)\s*\([A-Za-z .'-]+,\s*[A-Z]{2}\)$/;

function isMaxprepsSchoolLabelHometown(hometown: string): boolean {
  if (!MAXPREPS_SCHOOL_HOMETOWN.test(hometown.trim())) return false;
  const prefix = hometown.trim().replace(/\s*\([^)]+\)\s*$/, "").trim();
  return prefix.includes("(") || /\b(academy|high|school|prep|knights|eagles|bulldogs|commanders|warriors|lions|tigers|panthers|cougars|mustangs|raiders|patriots|wildcats|hornets|devils|saints|crusaders)\b/i.test(prefix);
}

/** Pull "City, ST" from MaxPreps school label when the trailing parens are US city/state. */
export function cityStateFromMaxprepsSchoolLabel(
  hometown: string | null | undefined,
): string | null {
  const h = hometown?.trim();
  if (!h) return null;
  const match = h.match(/\(([A-Za-z .'-]+),\s*([A-Z]{2})\)\s*$/);
  if (!match) return null;
  const city = match[1]!.trim();
  const state = match[2]!.trim();
  if (!city || state.length !== 2) return null;
  return `${city}, ${state}`;
}

/** True when hometown is almost certainly a school/team label, not a birthplace. */
export function isCollegeLikeHometown(
  hometown: string | null | undefined,
  ncaaTeamNames: readonly string[] = [],
): boolean {
  const h = hometown?.trim();
  if (!h) return false;

  const lower = h.toLowerCase();
  if (REAL_CITY_ALLOWLIST.has(lower) || REAL_HOMETOWN_ALLOWLIST.has(lower)) return false;
  if (COLLEGE_HOMETOWN_BLOCKLIST.has(lower)) return true;
  if (isMaxprepsSchoolLabelHometown(h)) return true;

  // "Melbourne (Australia)" — real; "St. John's (NY)" — college (blocklist above).
  if (/\([^)]+\)/.test(h) && COUNTRY_PARENTHETICAL.test(h)) {
    return false;
  }

  if (isLikelyRealHometown(h, ncaaTeamNames)) return false;

  for (const pattern of COLLEGE_NAME_PATTERNS) {
    if (pattern.test(h)) return true;
  }

  if (hometownMatchesNcaaTeamLabel(h, ncaaTeamNames)) return true;

  return false;
}

function hometownMatchesNcaaTeamLabel(
  hometown: string,
  ncaaTeamNames: readonly string[],
): boolean {
  const h = hometown.trim().toLowerCase();
  if (!h || h.includes(",")) return false;

  for (const teamName of ncaaTeamNames) {
    const t = teamName.trim().toLowerCase();
    const first = t.split(/\s+/)[0] ?? "";
    if (h === t || (h === first && first.length >= 3 && !REAL_CITY_ALLOWLIST.has(h))) {
      return true;
    }
    if (
      t.includes(h) &&
      h.length >= 4 &&
      !REAL_CITY_ALLOWLIST.has(h) &&
      !REAL_HOMETOWN_ALLOWLIST.has(h)
    ) {
      return true;
    }
  }
  return false;
}
