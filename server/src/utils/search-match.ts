import { sql, type SQL } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm/column";

/** True when any word in the column value starts with `query` (not mid-word). */
export function wordPrefixMatch(column: AnyColumn, query: string): SQL {
  const trimmed = query.trim().toLowerCase();
  const likePrefix = `${trimmed}%`;
  return sql`EXISTS (
    SELECT 1
    FROM unnest(regexp_split_to_array(lower(${column}), '[^a-z0-9]+')) AS w(word)
    WHERE w.word <> '' AND w.word LIKE ${likePrefix}
  )`;
}

/** True when the full column value starts with `query`. */
export function prefixMatch(column: AnyColumn, query: string): SQL {
  const likePrefix = `${query.trim().toLowerCase()}%`;
  return sql`lower(${column}) LIKE ${likePrefix}`;
}
