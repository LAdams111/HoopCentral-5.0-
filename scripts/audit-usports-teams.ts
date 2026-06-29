import dotenv from "dotenv";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main(): Promise<void> {
  const { db, closeDatabaseConnection } = await import("../server/src/db/index.js");
  const { leagues, teams } = await import("../server/src/db/schema/index.js");
  const { eq, sql, or, like } = await import("drizzle-orm");
  const { loadUsportsTeamAliasReport } = await import(
    "../server/src/utils/usports-team-aliases.js"
  );

  const [league] = await db.select().from(leagues).where(eq(leagues.slug, "u-sports")).limit(1);
  if (!league) {
    console.log("No u-sports league found.");
    await closeDatabaseConnection();
    return;
  }

  const leagueTeams = await db
    .select({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      abbreviation: teams.abbreviation,
    })
    .from(teams)
    .where(eq(teams.leagueId, league.id))
    .orderBy(teams.name);

  console.log(`U Sports teams in DB: ${leagueTeams.length}`);

  const report = loadUsportsTeamAliasReport();
  const aliasMap = report.aliasMap;

  function resolveSlug(slug: string): string {
    let current = slug;
    const seen = new Set<string>();
    while (aliasMap[current] && !seen.has(current)) {
      seen.add(current);
      current = aliasMap[current];
    }
    return current;
  }

  const groups = new Map<string, typeof leagueTeams>();
  for (const team of leagueTeams) {
    const canonical = resolveSlug(team.slug);
    const members = groups.get(canonical) ?? [];
    members.push(team);
    groups.set(canonical, members);
  }

  console.log("\nDuplicate groups (current aliasMap):");
  for (const [canonical, members] of [...groups.entries()].sort()) {
    if (members.length > 1) {
      console.log(
        `  ${canonical}: ${members.map((t) => `#${t.id}[${t.slug}] ${t.name}`).join(" | ")}`,
      );
    }
  }

  const slugSet = new Set(leagueTeams.map((t) => t.slug));

  const patterns: Array<{ label: string; test: (t: (typeof leagueTeams)[0]) => boolean }> = [
    {
      label: "stfx/st-francis",
      test: (t) => /st\.?\s*francis|stfx/i.test(`${t.name} ${t.slug}`),
    },
    {
      label: "dalhousie",
      test: (t) => /dalhousie/i.test(`${t.name} ${t.slug}`),
    },
    {
      label: "gamecocks",
      test: (t) => /gamecock|south.carolina/i.test(`${t.name} ${t.slug}`),
    },
  ];

  for (const { label, teams: matched } of patterns.map((p) => ({
    label: p.label,
    teams: leagueTeams.filter(p.test),
  }))) {
    if (matched.length > 0) {
      console.log(`\n${label}:`);
      for (const t of matched) console.log(`  #${t.id} [${t.slug}] ${t.name}`);
    }
  }

  const extraPatterns = [
    /tru|thompson-rivers/i,
    /twu|trinity-western/i,
    /rmc|royal-military/i,
    /memorial/i,
    /ubc|british-columbia/i,
    /unb|new-brunsw/i,
    /ufv|fraser/i,
    /upei|prince-edward/i,
    /uqam|quebec-a-montreal/i,
    /macewan/i,
    /mount-allison/i,
    /nait|northern-alberta/i,
    /gamecock|south.carolina/i,
    /barako|chicago|jamestown|maine-rc|belfast|chomutov|peja|reno-b|hoops/i,
  ];

  console.log("\nOther potential duplicates / misplaced:");
  for (const t of leagueTeams) {
    if (extraPatterns.some((re) => re.test(`${t.name} ${t.slug}`))) {
      console.log(`  #${t.id} [${t.slug}] ${t.name}`);
    }
  }

  console.log("\nAlias slugs in aliasMap but not in DB:");
  for (const [alias, canonical] of Object.entries(aliasMap)) {
    if (!slugSet.has(alias)) {
      console.log(`  missing alias: ${alias} -> ${canonical}`);
    }
  }

  const { playerSeasonStats } = await import("../server/src/db/schema/index.js");

  const gamecockRows = await db
    .select({
      id: teams.id,
      slug: teams.slug,
      name: teams.name,
      leagueSlug: leagues.slug,
    })
    .from(teams)
    .innerJoin(leagues, eq(teams.leagueId, leagues.id))
    .where(
      or(
        like(teams.name, "%Gamecock%"),
        like(teams.slug, "%gamecock%"),
        like(teams.name, "%South Carolina%"),
      ),
    );

  if (gamecockRows.length > 0) {
    console.log("\nGamecocks / South Carolina in DB:");
    for (const row of gamecockRows) {
      const [countRow] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(playerSeasonStats)
        .where(eq(playerSeasonStats.teamId, row.id));
      console.log(
        `  ${row.leagueSlug} #${row.id} [${row.slug}] ${row.name} stats=${countRow?.n ?? 0}`,
      );
    }
  }

  const misplacedSlugs = [
    "barako-bull",
    "belfast-star",
    "chicago-r",
    "chomutov",
    "hoops",
    "jamestown-j",
    "maine-rc",
    "peja",
    "reno-b",
  ];
  const misplaced = leagueTeams.filter((t) => misplacedSlugs.includes(t.slug));
  if (misplaced.length > 0) {
    console.log("\nMisplaced non-U-Sports teams:");
    for (const team of misplaced) {
      const [countRow] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(playerSeasonStats)
        .where(eq(playerSeasonStats.teamId, team.id));
      console.log(`  #${team.id} [${team.slug}] ${team.name} stats=${countRow?.n ?? 0}`);
    }
  }

  await closeDatabaseConnection();
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
