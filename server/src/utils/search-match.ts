import { sql, type SQL } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm/column";
import { teamSearchRegionPriority } from "./league-regions.js";

export function splitSearchWords(value: string): string[] {
  return value
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * True when every query token prefix-matches some word in the column value.
 * e.g. "Leo R" matches "Leo Rautins" (leo→leo, r→rautins), not only whole-string prefixes.
 */
export function wordPrefixMatch(column: AnyColumn, query: string): SQL {
  const trimmed = query.trim().toLowerCase();
  return sql`NOT EXISTS (
    SELECT 1
    FROM unnest(regexp_split_to_array(${trimmed}, '[^a-z0-9]+')) AS t(token)
    WHERE t.token <> ''
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(regexp_split_to_array(lower(${column}), '[^a-z0-9]+')) AS w(word)
        WHERE w.word <> '' AND w.word LIKE t.token || '%'
      )
  )`;
}

/** True when the full column value starts with `query`. */
export function prefixMatch(column: AnyColumn, query: string): SQL {
  const likePrefix = `${query.trim().toLowerCase()}%`;
  return sql`lower(${column}) LIKE ${likePrefix}`;
}

export function scoreTeamSearchMatch(
  team: { name: string; abbreviation: string; slug: string },
  query: string,
): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const name = team.name.trim().toLowerCase();
  const abbreviation = team.abbreviation.trim().toLowerCase();
  const slug = team.slug.trim().toLowerCase();
  const slugParts = slug.split("-").filter(Boolean);
  const words = splitSearchWords(name);
  const queryTokens = splitSearchWords(q);

  const tokenMatches = (token: string) =>
    words.some((word) => word.startsWith(token)) ||
    slugParts.some((part) => part.startsWith(token)) ||
    abbreviation.startsWith(token);

  if (!queryTokens.every(tokenMatches)) return 0;

  if (name === q || slug === q) return 1000;
  if (abbreviation === q) return 980;
  if (name.startsWith(`${q} `)) return 940;
  if (slug.startsWith(`${q}-`) || slugParts[0] === q) return 920;
  if (words[0] === q) return 900;
  if (abbreviation.startsWith(q)) return 860;
  if (words[0]?.startsWith(q) && words[0]!.length === q.length) return 840;
  if (words[0]?.startsWith(q)) return 780;

  let best = 0;
  for (let i = 1; i < words.length; i += 1) {
    const word = words[i]!;
    if (word === q) {
      best = Math.max(best, 620);
    } else if (word.startsWith(q)) {
      best = Math.max(best, word.length === q.length ? 620 : 140);
    }
  }

  for (const part of slugParts) {
    if (part === q) best = Math.max(best, 560);
    else if (part.startsWith(q)) {
      best = Math.max(best, part.length === q.length ? 560 : 120);
    }
  }

  return best || 100;
}

export function compareTeamSearchResults(
  a: { name: string; abbreviation: string; slug: string; league: { slug: string } },
  b: { name: string; abbreviation: string; slug: string; league: { slug: string } },
  query: string,
): number {
  const scoreDiff = scoreTeamSearchMatch(b, query) - scoreTeamSearchMatch(a, query);
  if (scoreDiff !== 0) return scoreDiff;

  const regionDiff =
    teamSearchRegionPriority(a.league.slug) - teamSearchRegionPriority(b.league.slug);
  if (regionDiff !== 0) return regionDiff;

  return a.name.localeCompare(b.name);
}
