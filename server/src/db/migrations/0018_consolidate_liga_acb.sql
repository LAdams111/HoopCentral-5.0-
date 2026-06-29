-- Merge USBasket auto-created Spanish league variants into canonical Liga ACB.
-- Fixes split Real Madrid rosters (spain-liga-endesa vs liga-endesa vs acb).

DO $$
DECLARE
  dst_league_id integer;
  src_league_id integer;
  src_slug text;
BEGIN
  SELECT id INTO dst_league_id FROM leagues WHERE slug = 'acb';
  IF dst_league_id IS NULL THEN
    INSERT INTO leagues (slug, name) VALUES ('acb', 'Liga ACB')
    ON CONFLICT (slug) DO NOTHING;
    SELECT id INTO dst_league_id FROM leagues WHERE slug = 'acb';
  END IF;

  IF dst_league_id IS NULL THEN
    RETURN;
  END IF;

  FOREACH src_slug IN ARRAY ARRAY['spain-liga-endesa', 'liga-endesa']
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

    INSERT INTO teams (league_id, slug, name, abbreviation)
    SELECT dst_league_id, src_t.slug, src_t.name, src_t.abbreviation
    FROM teams src_t
    WHERE src_t.league_id = src_league_id
      AND NOT EXISTS (
        SELECT 1
        FROM teams dst_t
        WHERE dst_t.league_id = dst_league_id
          AND dst_t.slug = src_t.slug
      );

    UPDATE player_season_stats pss
    SET team_id = dst_t.id
    FROM teams src_t
    INNER JOIN teams dst_t
      ON dst_t.league_id = dst_league_id
     AND dst_t.slug = src_t.slug
    WHERE pss.team_id = src_t.id
      AND src_t.league_id = src_league_id;

    UPDATE player_season_playoff_stats pps
    SET team_id = dst_t.id
    FROM teams src_t
    INNER JOIN teams dst_t
      ON dst_t.league_id = dst_league_id
     AND dst_t.slug = src_t.slug
    WHERE pps.team_id = src_t.id
      AND src_t.league_id = src_league_id;

    UPDATE player_stints ps
    SET team_id = dst_t.id
    FROM teams src_t
    INNER JOIN teams dst_t
      ON dst_t.league_id = dst_league_id
     AND dst_t.slug = src_t.slug
    WHERE ps.team_id = src_t.id
      AND src_t.league_id = src_league_id;

    -- Drop src-league rows that already exist on the canonical league (re-ingest duplicates).
    DELETE FROM player_season_playoff_stats pps
    USING player_season_stats src_pss, player_season_stats dst_pss,
          seasons src_s, seasons dst_s, teams src_t, teams dst_t
    WHERE pps.player_id = src_pss.player_id
      AND pps.season_id = src_pss.season_id
      AND pps.team_id = src_pss.team_id
      AND src_pss.league_id = src_league_id
      AND src_pss.season_id = src_s.id
      AND src_s.league_id = src_league_id
      AND dst_s.league_id = dst_league_id
      AND dst_s.season_label = src_s.season_label
      AND dst_pss.player_id = src_pss.player_id
      AND dst_pss.league_id = dst_league_id
      AND dst_pss.season_id = dst_s.id
      AND src_pss.team_id = src_t.id
      AND dst_pss.team_id = dst_t.id
      AND dst_t.league_id = dst_league_id
      AND dst_t.slug = src_t.slug;

    DELETE FROM player_season_stats src_pss
    USING seasons src_s, seasons dst_s, teams src_t, teams dst_t,
          player_season_stats dst_pss
    WHERE src_pss.league_id = src_league_id
      AND src_pss.season_id = src_s.id
      AND src_s.league_id = src_league_id
      AND dst_s.league_id = dst_league_id
      AND dst_s.season_label = src_s.season_label
      AND src_pss.team_id = src_t.id
      AND dst_pss.player_id = src_pss.player_id
      AND dst_pss.league_id = dst_league_id
      AND dst_pss.season_id = dst_s.id
      AND dst_pss.team_id = dst_t.id
      AND dst_t.league_id = dst_league_id
      AND dst_t.slug = src_t.slug;

    DELETE FROM player_stints src_ps
    USING seasons src_s, seasons dst_s, teams src_t, teams dst_t, player_stints dst_ps
    WHERE src_ps.league_id = src_league_id
      AND src_ps.season_id = src_s.id
      AND src_s.league_id = src_league_id
      AND dst_s.league_id = dst_league_id
      AND dst_s.season_label = src_s.season_label
      AND src_ps.team_id = src_t.id
      AND dst_ps.player_id = src_ps.player_id
      AND dst_ps.league_id = dst_league_id
      AND dst_ps.season_id = dst_s.id
      AND dst_ps.team_id = dst_t.id
      AND dst_t.league_id = dst_league_id
      AND dst_t.slug = src_t.slug;

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
    FROM seasons src_s, seasons dst_s, teams src_t
    WHERE pps.season_id = src_s.id
      AND src_s.league_id = src_league_id
      AND dst_s.league_id = dst_league_id
      AND dst_s.season_label = src_s.season_label
      AND pps.team_id = src_t.id
      AND src_t.league_id = dst_league_id;

    UPDATE player_stints ps
    SET
      league_id = dst_league_id,
      season_id = dst_s.id
    FROM seasons src_s, seasons dst_s
    WHERE ps.league_id = src_league_id
      AND ps.season_id = src_s.id
      AND src_s.league_id = src_league_id
      AND dst_s.league_id = dst_league_id
      AND dst_s.season_label = src_s.season_label;

    UPDATE team_season_records tsr
    SET
      team_id = dst_t.id,
      season_id = dst_s.id
    FROM seasons src_s, seasons dst_s, teams src_t, teams dst_t
    WHERE tsr.season_id = src_s.id
      AND src_s.league_id = src_league_id
      AND dst_s.league_id = dst_league_id
      AND dst_s.season_label = src_s.season_label
      AND tsr.team_id = src_t.id
      AND src_t.league_id = src_league_id
      AND dst_t.league_id = dst_league_id
      AND dst_t.slug = src_t.slug;

    DELETE FROM teams WHERE league_id = src_league_id;
    DELETE FROM seasons WHERE league_id = src_league_id;
    DELETE FROM leagues WHERE id = src_league_id;
  END LOOP;
END $$;
