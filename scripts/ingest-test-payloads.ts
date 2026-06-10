export interface IngestPayload {
  source: string;
  externalId: string;
  player: {
    displayName: string;
    birthDate: string;
    position: string;
    heightCm: number;
    weightKg: number;
    hometown: string;
  };
  league: { slug: string; name: string };
  team: { slug: string; name: string; abbreviation: string };
  season: { label: string };
  stats: {
    gamesPlayed: number;
    pointsPerGame: number;
    reboundsPerGame: number;
    assistsPerGame: number;
  };
}

interface PlayerTemplate {
  source: string;
  externalId: string;
  displayName: string;
  birthDate: string;
  position: string;
  heightCm: number;
  weightKg: number;
  hometown: string;
  league: { slug: string; name: string };
  team: { slug: string; name: string; abbreviation: string };
  seasons: string[];
}

function statsFor(index: number, seasonIndex: number) {
  const base = (index * 7 + seasonIndex * 3) % 20;
  return {
    gamesPlayed: 40 + base,
    pointsPerGame: Number((8 + base * 0.6).toFixed(1)),
    reboundsPerGame: Number((3 + base * 0.2).toFixed(1)),
    assistsPerGame: Number((2 + base * 0.15).toFixed(1)),
  };
}

function playerToPayloads(template: PlayerTemplate, index: number): IngestPayload[] {
  return template.seasons.map((label, seasonIndex) => ({
    source: template.source,
    externalId: template.externalId,
    player: {
      displayName: template.displayName,
      birthDate: template.birthDate,
      position: template.position,
      heightCm: template.heightCm,
      weightKg: template.weightKg,
      hometown: template.hometown,
    },
    league: template.league,
    team: template.team,
    season: { label },
    stats: statsFor(index, seasonIndex),
  }));
}

const SEED_OVERLAP: PlayerTemplate[] = [
  {
    source: "seed",
    externalId: "2544",
    displayName: "LeBron James",
    birthDate: "1984-12-30",
    position: "F",
    heightCm: 206,
    weightKg: 113,
    hometown: "Akron, Ohio",
    league: { slug: "nba", name: "NBA" },
    team: {
      slug: "los-angeles-lakers",
      name: "Los Angeles Lakers",
      abbreviation: "LAL",
    },
    seasons: ["2024-25"],
  },
  {
    source: "seed",
    externalId: "201939",
    displayName: "Stephen Curry",
    birthDate: "1988-03-14",
    position: "G",
    heightCm: 188,
    weightKg: 84,
    hometown: "Akron, Ohio",
    league: { slug: "nba", name: "NBA" },
    team: {
      slug: "golden-state-warriors",
      name: "Golden State Warriors",
      abbreviation: "GSW",
    },
    seasons: ["2023-24", "2024-25"],
  },
];

const NBA_PLAYERS: PlayerTemplate[] = [
  {
    source: "ingest-test-nba",
    externalId: "nba-test-001",
    displayName: "Marcus Testley",
    birthDate: "1998-04-12",
    position: "G",
    heightCm: 193,
    weightKg: 88,
    hometown: "Chicago, Illinois",
    league: { slug: "nba", name: "NBA" },
    team: { slug: "chicago-bulls", name: "Chicago Bulls", abbreviation: "CHI" },
    seasons: ["2023-24", "2024-25"],
  },
  {
    source: "ingest-test-nba",
    externalId: "nba-test-002",
    displayName: "Devon Rimrock",
    birthDate: "1996-11-02",
    position: "C",
    heightCm: 211,
    weightKg: 115,
    hometown: "Denver, Colorado",
    league: { slug: "nba", name: "NBA" },
    team: { slug: "denver-nuggets", name: "Denver Nuggets", abbreviation: "DEN" },
    seasons: ["2024-25"],
  },
  {
    source: "ingest-test-nba",
    externalId: "nba-test-003",
    displayName: "Tyler Baylor",
    birthDate: "2000-01-18",
    position: "F",
    heightCm: 201,
    weightKg: 98,
    hometown: "Miami, Florida",
    league: { slug: "nba", name: "NBA" },
    team: { slug: "miami-heat", name: "Miami Heat", abbreviation: "MIA" },
    seasons: ["2023-24", "2024-25"],
  },
  {
    source: "ingest-test-nba",
    externalId: "nba-test-004",
    displayName: "Chris Hardwood",
    birthDate: "1995-07-30",
    position: "F",
    heightCm: 203,
    weightKg: 102,
    hometown: "Boston, Massachusetts",
    league: { slug: "nba", name: "NBA" },
    team: { slug: "boston-celtics", name: "Boston Celtics", abbreviation: "BOS" },
    seasons: ["2024-25"],
  },
  {
    source: "ingest-test-nba",
    externalId: "nba-test-005",
    displayName: "Aaron Crosscourt",
    birthDate: "1999-09-09",
    position: "G",
    heightCm: 190,
    weightKg: 84,
    hometown: "Phoenix, Arizona",
    league: { slug: "nba", name: "NBA" },
    team: { slug: "phoenix-suns", name: "Phoenix Suns", abbreviation: "PHX" },
    seasons: ["2024-25"],
  },
  {
    source: "ingest-test-nba",
    externalId: "nba-test-006",
    displayName: "Jordan Cross",
    birthDate: "2001-03-15",
    position: "G",
    heightCm: 196,
    weightKg: 91,
    hometown: "Charlotte, North Carolina",
    league: { slug: "nba", name: "NBA" },
    team: {
      slug: "charlotte-hornets",
      name: "Charlotte Hornets",
      abbreviation: "CHA",
    },
    seasons: ["2024-25"],
  },
];

const WNBA_PLAYERS: PlayerTemplate[] = [
  {
    source: "ingest-test-wnba",
    externalId: "wnba-test-001",
    displayName: "Avery Sterling",
    birthDate: "1997-05-20",
    position: "G",
    heightCm: 178,
    weightKg: 72,
    hometown: "Indianapolis, Indiana",
    league: { slug: "wnba", name: "WNBA" },
    team: { slug: "indiana-fever", name: "Indiana Fever", abbreviation: "IND" },
    seasons: ["2024", "2025"],
  },
  {
    source: "ingest-test-wnba",
    externalId: "wnba-test-002",
    displayName: "Morgan Lights",
    birthDate: "1998-08-11",
    position: "F",
    heightCm: 185,
    weightKg: 78,
    hometown: "Las Vegas, Nevada",
    league: { slug: "wnba", name: "WNBA" },
    team: {
      slug: "las-vegas-aces",
      name: "Las Vegas Aces",
      abbreviation: "LVA",
    },
    seasons: ["2024"],
  },
  {
    source: "ingest-test-wnba",
    externalId: "wnba-test-003",
    displayName: "Sydney Parker",
    birthDate: "1999-02-28",
    position: "G",
    heightCm: 180,
    weightKg: 74,
    hometown: "Seattle, Washington",
    league: { slug: "wnba", name: "WNBA" },
    team: { slug: "seattle-storm", name: "Seattle Storm", abbreviation: "SEA" },
    seasons: ["2025"],
  },
  {
    source: "ingest-test-wnba",
    externalId: "wnba-test-004",
    displayName: "Riley Monroe",
    birthDate: "2000-12-01",
    position: "F",
    heightCm: 188,
    weightKg: 80,
    hometown: "New York, New York",
    league: { slug: "wnba", name: "WNBA" },
    team: {
      slug: "new-york-liberty",
      name: "New York Liberty",
      abbreviation: "NYL",
    },
    seasons: ["2024", "2025"],
  },
];

const GLEAGUE_PLAYERS: PlayerTemplate[] = [
  {
    source: "ingest-test-gleague",
    externalId: "gleague-test-001",
    displayName: "Noah Gentry",
    birthDate: "2002-06-14",
    position: "G",
    heightCm: 191,
    weightKg: 86,
    hometown: "Orlando, Florida",
    league: { slug: "g-league", name: "NBA G League" },
    team: { slug: "osceola-magic", name: "Osceola Magic", abbreviation: "ORL" },
    seasons: ["2024-25"],
  },
  {
    source: "ingest-test-gleague",
    externalId: "gleague-test-002",
    displayName: "Ethan Baseline",
    birthDate: "2001-10-05",
    position: "F",
    heightCm: 198,
    weightKg: 95,
    hometown: "Toronto, Ontario",
    league: { slug: "g-league", name: "NBA G League" },
    team: { slug: "raptors-905", name: "Raptors 905", abbreviation: "RAP" },
    seasons: ["2023-24", "2024-25"],
  },
  {
    source: "ingest-test-gleague",
    externalId: "gleague-test-003",
    displayName: "Logan Courtside",
    birthDate: "2003-01-22",
    position: "G",
    heightCm: 188,
    weightKg: 82,
    hometown: "Austin, Texas",
    league: { slug: "g-league", name: "NBA G League" },
    team: { slug: "austin-spurs", name: "Austin Spurs", abbreviation: "AUS" },
    seasons: ["2024-25"],
  },
  {
    source: "ingest-test-gleague",
    externalId: "gleague-test-004",
    displayName: "Caleb Rimview",
    birthDate: "2000-04-17",
    position: "C",
    heightCm: 208,
    weightKg: 108,
    hometown: "South Bay, California",
    league: { slug: "g-league", name: "NBA G League" },
    team: {
      slug: "south-bay-lakers",
      name: "South Bay Lakers",
      abbreviation: "SBL",
    },
    seasons: ["2024-25"],
  },
  {
    source: "ingest-test-gleague",
    externalId: "gleague-test-005",
    displayName: "Dylan Fastbreak",
    birthDate: "2002-08-30",
    position: "F",
    heightCm: 200,
    weightKg: 92,
    hometown: "Oklahoma City, Oklahoma",
    league: { slug: "g-league", name: "NBA G League" },
    team: {
      slug: "oklahoma-city-blue",
      name: "Oklahoma City Blue",
      abbreviation: "OKC",
    },
    seasons: ["2023-24", "2024-25"],
  },
];

const NCAA_PLAYERS: PlayerTemplate[] = [
  {
    source: "ingest-test-ncaa",
    externalId: "ncaa-test-001",
    displayName: "Jordan Cross",
    birthDate: "2001-03-15",
    position: "G",
    heightCm: 196,
    weightKg: 91,
    hometown: "Charlotte, North Carolina",
    league: { slug: "ncaa", name: "NCAA Division I" },
    team: { slug: "duke-blue-devils", name: "Duke Blue Devils", abbreviation: "DUKE" },
    seasons: ["2023-24"],
  },
  {
    source: "ingest-test-ncaa",
    externalId: "ncaa-test-002",
    displayName: "Grant Hawkeye",
    birthDate: "2002-02-02",
    position: "F",
    heightCm: 203,
    weightKg: 99,
    hometown: "Iowa City, Iowa",
    league: { slug: "ncaa", name: "NCAA Division I" },
    team: {
      slug: "kansas-jayhawks",
      name: "Kansas Jayhawks",
      abbreviation: "KU",
    },
    seasons: ["2023-24", "2024-25"],
  },
  {
    source: "ingest-test-ncaa",
    externalId: "ncaa-test-003",
    displayName: "Miles Tarheel",
    birthDate: "2003-05-11",
    position: "G",
    heightCm: 192,
    weightKg: 87,
    hometown: "Chapel Hill, North Carolina",
    league: { slug: "ncaa", name: "NCAA Division I" },
    team: {
      slug: "north-carolina-tar-heels",
      name: "North Carolina Tar Heels",
      abbreviation: "UNC",
    },
    seasons: ["2024-25"],
  },
  {
    source: "ingest-test-ncaa",
    externalId: "ncaa-test-004",
    displayName: "Ben Huskie",
    birthDate: "2001-11-19",
    position: "C",
    heightCm: 210,
    weightKg: 112,
    hometown: "Storrs, Connecticut",
    league: { slug: "ncaa", name: "NCAA Division I" },
    team: { slug: "uconn-huskies", name: "UConn Huskies", abbreviation: "UCONN" },
    seasons: ["2023-24", "2024-25"],
  },
  {
    source: "ingest-test-ncaa",
    externalId: "ncaa-test-005",
    displayName: "Owen Boiler",
    birthDate: "2002-07-07",
    position: "F",
    heightCm: 201,
    weightKg: 96,
    hometown: "West Lafayette, Indiana",
    league: { slug: "ncaa", name: "NCAA Division I" },
    team: {
      slug: "purdue-boilermakers",
      name: "Purdue Boilermakers",
      abbreviation: "PUR",
    },
    seasons: ["2024-25"],
  },
];

const ALL_TEMPLATES = [
  ...SEED_OVERLAP,
  ...NBA_PLAYERS,
  ...WNBA_PLAYERS,
  ...GLEAGUE_PLAYERS,
  ...NCAA_PLAYERS,
];

export function buildUniquePayloads(): IngestPayload[] {
  return ALL_TEMPLATES.flatMap((template, index) =>
    playerToPayloads(template, index),
  );
}

/** Duplicate payloads to exercise idempotency within a single run. */
export function buildDuplicatePayloads(unique: IngestPayload[]): IngestPayload[] {
  const picks = [
    unique[0],
    unique[1],
    unique[2],
    unique.find((p) => p.externalId === "nba-test-001" && p.season.label === "2023-24"),
    unique.find((p) => p.externalId === "nba-test-001" && p.season.label === "2024-25"),
    unique.find((p) => p.externalId === "wnba-test-001" && p.season.label === "2024"),
    unique.find((p) => p.source === "ingest-test-gleague" && p.externalId === "gleague-test-002"),
    unique.find((p) => p.source === "ingest-test-ncaa" && p.externalId === "ncaa-test-002"),
  ].filter((p): p is IngestPayload => Boolean(p));

  return picks;
}

export function buildAllTestPayloads(): IngestPayload[] {
  const unique = buildUniquePayloads();
  return [...unique, ...buildDuplicatePayloads(unique)];
}

export const UNIQUE_PAYLOAD_COUNT = buildUniquePayloads().length;
export const TOTAL_PAYLOAD_COUNT = buildAllTestPayloads().length;
