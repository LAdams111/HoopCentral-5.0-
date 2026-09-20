/**
 * Parse RSEQ / StatCrew team pages + individual game boxes.
 * Example: http://www.rseq-stats.ca/universitaire/basketball-m/stats/2526/conc.htm
 */

const UA = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
};

export function normName(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(name) {
  return normName(name).split(" ").filter(Boolean);
}

function lastNameClose(a, b) {
  if (a === b) return true;
  if (a.startsWith(b) || b.startsWith(a)) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let diffs = 0;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    if (a[i] !== b[i]) diffs += 1;
    if (diffs > 1) return false;
  }
  return diffs <= 1;
}

export function namesMatch(a, b) {
  const na = normName(a);
  const nb = normName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.startsWith(nb) || nb.startsWith(na)) return true;
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.length < 2 || tb.length < 2) return false;
  const lastOk = lastNameClose(ta.at(-1), tb.at(-1));
  if (!lastOk) return false;
  const firstOk = ta[0] === tb[0] || ta[0].startsWith(tb[0]) || tb[0].startsWith(ta[0]);
  if (firstOk) return true;
  const shorter = ta.length <= tb.length ? ta : tb;
  const longer = ta.length <= tb.length ? tb : ta;
  if (
    shorter.length >= 2 &&
    shorter.every((t) => longer.some((x) => x === t || x.startsWith(t) || t.startsWith(x)))
  ) {
    return true;
  }
  return ta.some((t) => tb.includes(t) && t.length > 2);
}

export function matchOfficialPlayer(rawName, jersey, players) {
  const byJersey = jersey
    ? players.filter((p) => String(p.jersey || "") === String(jersey))
    : [];
  const nameHits = players.filter((p) => namesMatch(rawName, p.name));
  if (nameHits.length === 1) return nameHits[0];
  if (byJersey.length === 1 && namesMatch(rawName, byJersey[0].name)) return byJersey[0];
  if (byJersey.length === 1 && nameHits.includes(byJersey[0])) return byJersey[0];
  if (byJersey.length === 1) {
    const rawFirst = tokens(rawName)[0];
    const hitFirst = tokens(byJersey[0].name)[0];
    if (
      lastNameClose(tokens(rawName).at(-1), tokens(byJersey[0].name).at(-1)) ||
      (rawFirst && hitFirst && (rawFirst === hitFirst || rawFirst.startsWith(hitFirst) || hitFirst.startsWith(rawFirst)))
    ) {
      return byJersey[0];
    }
  }
  return nameHits[0] ?? null;
}

function decode(html) {
  return html
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function textFromHtml(html) {
  return decode(html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "\n"))
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n");
}

const PLAYER_LINE =
  /^(\d+)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .'-]+?)\.*\s+(\*)?\s*(-?\d+)\s+(\d+)\s+(-?\d+)\s+(\d+)\s+(-?\d+)\s+(\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(\d+)\s*$/;

export function parseStatCrewPlayerLine(line) {
  const m = PLAYER_LINE.exec(line.replace(/\s+/g, " ").trim());
  if (!m) return null;
  return {
    jersey: m[1],
    name: m[2].replace(/\s+/g, " ").trim(),
    started: Boolean(m[3]),
    fgMade: Number(m[4]),
    fgAtt: Number(m[5]),
    fg3Made: Number(m[6]),
    fg3Att: Number(m[7]),
    ftMade: Number(m[8]),
    ftAtt: Number(m[9]),
    off: Number(m[10]),
    def: Number(m[11]),
    rebounds: Number(m[12]),
    fouls: Number(m[13]),
    points: Number(m[14]),
    assists: Number(m[15]),
    turnovers: Number(m[16]),
    blocks: Number(m[17]),
    steals: Number(m[18]),
    minutes: String(m[19]),
  };
}

function preText(html) {
  const blocks = [...html.matchAll(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi)].map((m) =>
    decode(m[1]),
  );
  if (!blocks.length) return textFromHtml(html);
  return (
    blocks.find((block) => /Box Score \(Final\)/i.test(block)) ||
    [...blocks].sort((a, b) => b.length - a.length)[0]
  );
}

function tableCellTexts(rowHtml) {
  return [...rowHtml.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) =>
    decode(m[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim(),
  );
}

export function parseGameBox(html, schoolName = "Concordia") {
  const text = preText(html);
  const title =
    /<title>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.replace(/\s+/g, " ").trim() ||
    text.split("\n").find((ln) => /vs/i.test(ln)) ||
    "";
  const date = /(\d{4}-\d{2}-\d{2})/.exec(title)?.[1] ?? /(\d{4}-\d{2}-\d{2})/.exec(text)?.[1] ?? null;
  const school = schoolName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const vs = new RegExp(`${school}\\s+vs\\s+(.+?)\\s+\\(`, "i").exec(title);
  const at = new RegExp(`(.+?)\\s+vs\\s+${school}\\s+\\(`, "i").exec(title);
  let opponent = "";
  let homeAway = "";
  if (vs) {
    opponent = vs[1].trim();
    homeAway = "";
  } else if (at) {
    opponent = at[1].trim();
    homeAway = "@";
  }
  const result = /\b([WL])\s+(\d+-\d+)/i.exec(text);
  const sectionRe = new RegExp(`^(?:VISITORS|HOME(?: TEAM)?):\\s*${school}\\b`, "im");
  const start = text.search(sectionRe);
  if (start < 0) return { date, opponent, homeAway, result: result?.[0] ?? null, players: [] };
  const rest = text.slice(start);
  const nextTeam = rest.slice(20).search(/^(?:VISITORS|HOME(?: TEAM)?):/m);
  const section = nextTeam >= 0 ? rest.slice(0, 20 + nextTeam) : rest.slice(0, 4000);
  const players = [];
  for (const raw of section.split("\n")) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (/^TM\s+Team/i.test(line) || /totals/i.test(line)) break;
    const parsed = parseStatCrewPlayerLine(line);
    if (parsed) players.push(parsed);
  }
  return {
    date,
    opponent,
    homeAway,
    result: result ? `${result[1].toUpperCase()} ${result[2]}` : null,
    players,
  };
}

export function parseSeasonBox(html) {
  const start = html.toLowerCase().indexOf("season box score");
  const chunk = start >= 0 ? html.slice(start, start + 80_000) : html;
  const tables = [...chunk.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];
  for (const table of tables) {
    const players = [];
    for (const row of table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = tableCellTexts(row[1]);
      if (cells.length < 24) continue;
      if (!/^\d+$/.test(cells[0]) || !/^[A-Za-zÀ-ÿ]/.test(cells[1])) continue;
      const gp = Number(cells[2]);
      if (!gp) continue;
      const num = (i) => {
        const n = Number(String(cells[i] ?? "").replace(/[^0-9.-]/g, ""));
        return Number.isFinite(n) ? n : null;
      };
      const pct = (i) => {
        const n = num(i);
        if (n == null) return null;
        return n <= 1 ? Math.round(n * 1000) / 10 : n;
      };
      players.push({
        jersey: cells[0],
        name: cells[1].replace(/\s+/g, " ").trim(),
        gamesPlayed: gp,
        gamesStarted: num(3),
        minutes: num(4),
        points: num(25),
        pointsPerGame: num(26),
        fieldGoalPct: pct(8),
        threePointPct: pct(11),
        freeThrowPct: pct(14),
        reboundsPerGame: num(18),
        assistsPerGame: Math.round(((num(21) ?? 0) / gp) * 10) / 10,
        stealsPerGame: Math.round(((num(24) ?? 0) / gp) * 10) / 10,
        blocksPerGame: Math.round(((num(23) ?? 0) / gp) * 10) / 10,
      });
    }
    if (players.length >= 3) return players;
  }
  return [];
}

export function teamPageGameHrefs(html) {
  const hrefs = [...html.matchAll(/href="([^"]+\.htm)"/gi)].map((m) => m[1]);
  return [...new Set(hrefs.filter((h) => !h.startsWith("#") && !/conc\.htm/i.test(h)))];
}

export async function fetchRseqTeam(teamPageUrl, schoolName, fetchImpl = fetch) {
  const res = await fetchImpl(teamPageUrl, { headers: UA });
  if (!res.ok) throw new Error(`RSEQ team page ${res.status}: ${teamPageUrl}`);
  const html = await res.text();
  const seasonStats = parseSeasonBox(html);
  const base = new URL(teamPageUrl);
  const games = [];
  for (const href of teamPageGameHrefs(html)) {
    const url = new URL(href, base).toString();
    try {
      const gameRes = await fetchImpl(url, { headers: UA });
      if (!gameRes.ok) continue;
      const gameHtml = await gameRes.text();
      const parsed = parseGameBox(gameHtml, schoolName);
      if (parsed.players.length) games.push({ url, ...parsed });
      await new Promise((resolve) => setTimeout(resolve, 150));
    } catch {
      /* skip one game */
    }
  }
  return { seasonStats, games };
}

export function attachRseqToRoster(players, rseq, seasonLabel) {
  const byId = new Map(players.map((p) => [p.externalId, { ...p, gameLogs: [], seasonStats: p.seasonStats ?? {} }]));
  const roster = [...byId.values()];

  for (const row of rseq.seasonStats) {
    const hit = matchOfficialPlayer(row.name, row.jersey, roster);
    if (!hit) continue;
    if ((hit.seasonStats?.gamesPlayed ?? 0) > row.gamesPlayed) continue;
    hit.seasonStats = {
      gamesPlayed: row.gamesPlayed,
      pointsPerGame: row.pointsPerGame,
      fieldGoalPct: row.fieldGoalPct,
      threePointPct: row.threePointPct,
      freeThrowPct: row.freeThrowPct,
      reboundsPerGame: row.reboundsPerGame,
      assistsPerGame: row.assistsPerGame,
      stealsPerGame: row.stealsPerGame,
      blocksPerGame: row.blocksPerGame,
    };
  }

  for (const game of rseq.games) {
    for (const box of game.players) {
      const hit = matchOfficialPlayer(box.name, box.jersey, roster);
      if (!hit) continue;
      hit.gameLogs.push({
        date: game.date,
        homeAway: game.homeAway,
        opponent: game.opponent,
        result: game.result,
        started: box.started,
        minutes: box.minutes,
        points: box.points,
        rebounds: box.rebounds,
        assists: box.assists,
        steals: box.steals,
        blocks: box.blocks,
        turnovers: box.turnovers,
        fouls: box.fouls,
        fgMade: box.fgMade,
        fgAtt: box.fgAtt,
        fg3Made: box.fg3Made,
        fg3Att: box.fg3Att,
        ftMade: box.ftMade,
        ftAtt: box.ftAtt,
        plusMinus: null,
        playoffs: false,
        off: box.off,
        def: box.def,
      });
    }
  }

  return roster;
}
