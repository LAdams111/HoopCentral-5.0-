ALTER TABLE players ADD COLUMN IF NOT EXISTS hs_class_of integer;

COMMENT ON COLUMN players.hs_class_of IS 'US high school graduation class (e.g. 2003 for Class of 2003).';

UPDATE players
SET hs_class_of = (extract(year FROM birth_date)::int + 19)
WHERE birth_date IS NOT NULL
  AND hs_class_of IS NULL
  AND extract(year FROM birth_date)::int >= 1950
  AND extract(year FROM birth_date)::int + 19 <= 2040;

CREATE INDEX IF NOT EXISTS players_hs_class_of_idx ON players (hs_class_of)
WHERE hs_class_of IS NOT NULL;
