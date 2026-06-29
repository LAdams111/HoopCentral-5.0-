-- Merge auto-created australia-nbl league into pre-seeded nbl (NBL Australia).
-- Idempotent: no-op when australia-nbl does not exist.

DO $$
DECLARE
  src_league_id integer;
  dst_league_id integer;
BEGIN
  SELECT id INTO src_league_id FROM leagues WHERE slug = 'australia-nbl';
  SELECT id INTO dst_league_id FROM leagues WHERE slug = 'nbl';

  IF src_league_id IS NULL OR dst_league_id IS NULL OR src_league_id = dst_league_id THEN
    RETURN;
  END IF;

  -- Ensure destination seasons exist for every source season label.
  INSERT INTO seasons (league_id, season_label)
  SELECT dst_league_id, src_s.season_label
  FROM seasons src_s
  WHERE src_s.league_id = src_league_id
    AND NOT EXISTS (
      SELECT 1
      FROM seasons dst_s
      WHERE dst_s.league_id = dst_league_id
        AND dst_s.season_label = src_s.season_label
    );

  -- Point player season stats at destination league seasons.
  UPDATE player_season_stats pss
  SET
    league_id = dst_league_id,
    season_id = dst_s.id
  FROM seasons src_s, seasons dst_s
  WHERE pss.league_id = src_league_id
    AND pss.season_id = src_s.id
    AND src_s.league_id = src_league_id
    AND dst_s.league_id = dst_league_id
    AND dst_s.season_label = src_s.season_label;

  -- Playoff stats (added in 0013).
  UPDATE player_season_playoff_stats pps
  SET season_id = dst_s.id
  FROM seasons src_s, seasons dst_s
  WHERE pps.season_id = src_s.id
    AND src_s.league_id = src_league_id
    AND dst_s.league_id = dst_league_id
    AND dst_s.season_label = src_s.season_label;

  -- Stints and team records tied to source league.
  UPDATE player_stints ps
  SET
    league_id = dst_league_id,
    season_id = COALESCE(
      (
        SELECT dst_s.id
        FROM seasons src_s
        INNER JOIN seasons dst_s
          ON dst_s.league_id = dst_league_id
         AND dst_s.season_label = src_s.season_label
        WHERE src_s.id = ps.season_id
        LIMIT 1
      ),
      ps.season_id
    )
  WHERE ps.league_id = src_league_id;

  UPDATE team_season_records tsr
  SET
    season_id = dst_s.id
  FROM seasons src_s, seasons dst_s
  WHERE tsr.season_id = src_s.id
    AND src_s.league_id = src_league_id
    AND dst_s.league_id = dst_league_id
    AND dst_s.season_label = src_s.season_label;

  -- Move teams that do not already exist under the destination league slug.
  UPDATE teams t
  SET league_id = dst_league_id
  WHERE t.league_id = src_league_id
    AND NOT EXISTS (
      SELECT 1
      FROM teams existing
      WHERE existing.league_id = dst_league_id
        AND existing.slug = t.slug
    );

  -- Drop source league artifacts when safe.
  DELETE FROM seasons WHERE league_id = src_league_id;
  DELETE FROM teams WHERE league_id = src_league_id;
  DELETE FROM leagues WHERE id = src_league_id;
END $$;
