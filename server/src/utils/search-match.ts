import { sql, type SQL } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm/column";

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
