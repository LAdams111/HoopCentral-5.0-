-- Seed canonical French leagues and merge legacy ProA variants.
-- Remove mis-parsed Rudy Gobert usbasket-profile rows before re-enrich.

INSERT INTO leagues (slug, name)
VALUES
  ('lnb-pro-a', 'LNB Pro A'),
  ('lnb-u21', 'LNB Pro A U21')
ON CONFLICT (slug) DO NOTHING;

DO $$
DECLARE
  dst_league_id integer;
  src_league_id integer;
  src_slug text;
BEGIN
  SELECT id INTO dst_league_id FROM leagues WHERE slug = 'lnb-pro-a';
  IF dst_league_id IS NULL THEN
    RETURN;
  END IF;

  FOREACH src_slug IN ARRAY ARRAY['proa', 'jeep-elite-proa', 'betclic-elite-proa']
  LOOP
    SELECT id INTO src_league_id FROM leagues WHERE slug = src_slug;
    IF src_league_id IS NULL OR src_league_id = dst_league_id THEN
      CONTINUE;
    END IF;

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

    UPDATE player_season_playoff_stats pps
    SET season_id = dst_s.id
    FROM seasons src_s, seasons dst_s
    WHERE pps.season_id = src_s.id
      AND src_s.league_id = src_league_id
      AND dst_s.league_id = dst_league_id
      AND dst_s.season_label = src_s.season_label;

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
    SET season_id = dst_s.id
    FROM seasons src_s, seasons dst_s
    WHERE tsr.season_id = src_s.id
      AND src_s.league_id = src_league_id
      AND dst_s.league_id = dst_league_id
      AND dst_s.season_label = src_s.season_label;

    UPDATE teams t
    SET league_id = dst_league_id
    WHERE t.league_id = src_league_id
      AND NOT EXISTS (
        SELECT 1
        FROM teams existing
        WHERE existing.league_id = dst_league_id
          AND existing.slug = t.slug
      );

    DELETE FROM seasons WHERE league_id = src_league_id;
    DELETE FROM teams WHERE league_id = src_league_id;
    DELETE FROM leagues WHERE id = src_league_id;
  END LOOP;
END $$;

DELETE FROM player_season_playoff_stats pps
USING players p, teams t, leagues l
WHERE pps.player_id = p.id
  AND pps.team_id = t.id
  AND pps.league_id = l.id
  AND p.id = 423
  AND l.slug = 'unknown'
  AND t.slug IN ('1-078-800', 'cholet-basket-u21-team');

DELETE FROM player_stints ps
USING players p, teams t, leagues l, seasons s
WHERE ps.player_id = p.id
  AND ps.team_id = t.id
  AND ps.league_id = l.id
  AND ps.season_id = s.id
  AND p.id = 423
  AND l.slug = 'unknown'
  AND t.slug IN ('1-078-800', 'cholet-basket-u21-team');

DELETE FROM player_season_stats pss
USING players p, teams t, leagues l
WHERE pss.player_id = p.id
  AND pss.team_id = t.id
  AND pss.league_id = l.id
  AND p.id = 423
  AND l.slug = 'unknown'
  AND t.slug IN ('1-078-800', 'cholet-basket-u21-team');
