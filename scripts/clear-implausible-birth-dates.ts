/**
 * Null out birth dates that cannot be real basketball player DOBs:
 * - future / younger than MIN_PLAYER_AGE_YEARS today
 * - older than MIN_BIRTH_YEAR
 * - born after the player's first recorded season year
 *
 * Usage:
 *   npx tsx --tsconfig server/tsconfig.json scripts/clear-implausible-birth-dates.ts
 *   npx tsx --tsconfig server/tsconfig.json scripts/clear-implausible-birth-dates.ts --apply
 */
import "../server/src/load-env.js";
import { sql } from "drizzle-orm";
import { db } from "../server/src/db/index.js";
import {
  MIN_BIRTH_YEAR,
  MIN_PLAYER_AGE_YEARS,
  maxPlausibleBirthYear,
} from "../server/src/utils/birth-date.js";

const APPLY = process.argv.includes("--apply");

async function main() {
  const maxYear = maxPlausibleBirthYear();
  console.log(
    `Clearing implausible birth dates (keep years ${MIN_BIRTH_YEAR}–${maxYear}, min age ${MIN_PLAYER_AGE_YEARS})`,
  );
  console.log(APPLY ? "Mode: APPLY" : "Mode: DRY RUN (pass --apply to write)");

  const preview = await db.execute(sql`
    with first_szn as (
      select pss.player_id,
        min(left(s.season_label, 4)::int) as first_year
      from player_season_stats pss
      join seasons s on s.id = pss.season_id
      where s.season_label ~ '^[0-9]{4}'
      group by pss.player_id
    )
    select p.id, p.display_name, p.birth_date::text as birth_date, f.first_year,
      case
        when extract(year from p.birth_date)::int < ${MIN_BIRTH_YEAR} then 'before_min_year'
        when extract(year from p.birth_date)::int > ${maxYear} then 'too_young_or_future'
        when f.first_year is not null
          and extract(year from p.birth_date)::int > f.first_year then 'born_after_first_season'
        else 'other'
      end as reason
    from players p
    left join first_szn f on f.player_id = p.id
    where p.birth_date is not null
      and (
        extract(year from p.birth_date)::int < ${MIN_BIRTH_YEAR}
        or extract(year from p.birth_date)::int > ${maxYear}
        or (
          f.first_year is not null
          and extract(year from p.birth_date)::int > f.first_year
        )
      )
    order by p.birth_date desc, p.id
  `);

  const rows = (preview.rows ?? preview) as Array<{
    id: number;
    display_name: string;
    birth_date: string;
    first_year: number | null;
    reason: string;
  }>;

  const byReason = new Map<string, number>();
  for (const r of rows) {
    byReason.set(r.reason, (byReason.get(r.reason) ?? 0) + 1);
  }
  console.log(`Candidates: ${rows.length}`);
  for (const [reason, n] of [...byReason.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${reason}: ${n}`);
  }
  for (const r of rows.slice(0, 25)) {
    console.log(
      `  #${r.id} ${r.display_name} dob=${r.birth_date} first=${r.first_year ?? "-"} (${r.reason})`,
    );
  }
  if (rows.length > 25) console.log(`  ... and ${rows.length - 25} more`);

  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to null these birth_date values.");
    process.exit(0);
  }

  const result = await db.execute(sql`
    with first_szn as (
      select pss.player_id,
        min(left(s.season_label, 4)::int) as first_year
      from player_season_stats pss
      join seasons s on s.id = pss.season_id
      where s.season_label ~ '^[0-9]{4}'
      group by pss.player_id
    )
    update players p
    set birth_date = null, updated_at = now()
    from first_szn f
    where p.id = f.player_id
      and p.birth_date is not null
      and (
        extract(year from p.birth_date)::int < ${MIN_BIRTH_YEAR}
        or extract(year from p.birth_date)::int > ${maxYear}
        or extract(year from p.birth_date)::int > f.first_year
      )
  `);

  // Also clear players with no seasons but impossible DOBs
  const noSeason = await db.execute(sql`
    update players p
    set birth_date = null, updated_at = now()
    where p.birth_date is not null
      and not exists (select 1 from player_season_stats pss where pss.player_id = p.id)
      and (
        extract(year from p.birth_date)::int < ${MIN_BIRTH_YEAR}
        or extract(year from p.birth_date)::int > ${maxYear}
      )
  `);

  console.log("Updated (with seasons):", result.rowCount ?? result);
  console.log("Updated (no seasons):", noSeason.rowCount ?? noSeason);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
