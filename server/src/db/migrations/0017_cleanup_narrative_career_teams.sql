-- Remove mis-parsed narrative transaction career rows (signed-at / missed-season junk team names).

DELETE FROM player_season_playoff_stats pps
USING players p, teams t, leagues l
WHERE pps.player_id = p.id
  AND pps.team_id = t.id
  AND pps.league_id = l.id
  AND (
    t.slug LIKE '%signed-at-%'
    OR t.slug LIKE '%missed-most%'
    OR t.name ~* 'signed at'
    OR t.name ~* '^in feb'
    OR t.name ~* '^missed most'
  );

DELETE FROM player_stints ps
USING players p, teams t, leagues l
WHERE ps.player_id = p.id
  AND ps.team_id = t.id
  AND ps.league_id = l.id
  AND (
    t.slug LIKE '%signed-at-%'
    OR t.slug LIKE '%missed-most%'
    OR t.name ~* 'signed at'
    OR t.name ~* '^in feb'
    OR t.name ~* '^missed most'
  );

DELETE FROM player_season_stats pss
USING players p, teams t, leagues l
WHERE pss.player_id = p.id
  AND pss.team_id = t.id
  AND pss.league_id = l.id
  AND (
    t.slug LIKE '%signed-at-%'
    OR t.slug LIKE '%missed-most%'
    OR t.name ~* 'signed at'
    OR t.name ~* '^in feb'
    OR t.name ~* '^missed most'
  );

DELETE FROM teams t
WHERE (
    t.slug LIKE '%signed-at-%'
    OR t.slug LIKE '%missed-most%'
    OR t.name ~* 'signed at'
    OR t.name ~* '^in feb'
    OR t.name ~* '^missed most'
  )
  AND NOT EXISTS (SELECT 1 FROM player_season_stats pss WHERE pss.team_id = t.id)
  AND NOT EXISTS (SELECT 1 FROM player_stints ps WHERE ps.team_id = t.id);
