-- Remove mis-parsed draft/trade career rows (not real team stints).

DELETE FROM player_season_playoff_stats pps
USING players p, teams t, leagues l
WHERE pps.player_id = p.id
  AND pps.team_id = t.id
  AND pps.league_id = l.id
  AND (
    l.slug = 'traded-to-dallas'
    OR t.slug LIKE 'drafted-by-%'
    OR t.name ~* '^drafted by'
    OR t.name ~* '^declared for'
    OR t.name ~* '^\$[0-9]'
  );

DELETE FROM player_stints ps
USING players p, teams t, leagues l
WHERE ps.player_id = p.id
  AND ps.team_id = t.id
  AND ps.league_id = l.id
  AND (
    l.slug = 'traded-to-dallas'
    OR t.slug LIKE 'drafted-by-%'
    OR t.name ~* '^drafted by'
    OR t.name ~* '^declared for'
    OR t.name ~* '^\$[0-9]'
  );

DELETE FROM player_season_stats pss
USING players p, teams t, leagues l
WHERE pss.player_id = p.id
  AND pss.team_id = t.id
  AND pss.league_id = l.id
  AND (
    l.slug = 'traded-to-dallas'
    OR t.slug LIKE 'drafted-by-%'
    OR t.name ~* '^drafted by'
    OR t.name ~* '^declared for'
    OR t.name ~* '^\$[0-9]'
  );

DELETE FROM leagues l
WHERE l.slug = 'traded-to-dallas'
  AND NOT EXISTS (SELECT 1 FROM teams t WHERE t.league_id = l.id)
  AND NOT EXISTS (SELECT 1 FROM player_season_stats pss WHERE pss.league_id = l.id);
