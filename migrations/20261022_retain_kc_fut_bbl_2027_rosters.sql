-- VCT EMEA 2027: KC, FUT y BBL mantienen su plantilla actual.
--
-- No se crean jugadores ni se modifican equipos o roles. Se promueven
-- exclusivamente los quince registros que ya pertenecen a estos clubes.
-- La temporada VCT 2027 permanece en draft.

WITH retained_roster(player_id, team_id) AS (
  VALUES
    -- Karmine Corp
    ('ac4bf5dd-2b3d-46f6-a4bb-3d9964a08cf7'::uuid, '1bfb564a-3c49-4caf-8e26-d68df234f7e5'::uuid), -- Avez
    ('4204d293-902f-49ae-a230-b7bc869ad1e3'::uuid, '1bfb564a-3c49-4caf-8e26-d68df234f7e5'::uuid), -- dos9
    ('f5e1f094-ab78-41e1-8971-18d765092c79'::uuid, '1bfb564a-3c49-4caf-8e26-d68df234f7e5'::uuid), -- LewN
    ('6f82c0fe-304e-4f73-bb4f-a8fb67a16f5a'::uuid, '1bfb564a-3c49-4caf-8e26-d68df234f7e5'::uuid), -- N4RRATE
    ('7522a404-4982-4527-ab2b-1395f074f693'::uuid, '1bfb564a-3c49-4caf-8e26-d68df234f7e5'::uuid), -- SUYGETSU
    -- FUT Esports
    ('b84c5218-bf89-41ad-8e3b-5642ba2b0b71'::uuid, '9473e57a-92d0-4888-9df7-a1f87f727c4e'::uuid), -- KROSTALY
    ('d7b4f702-1070-4817-95fd-8c1e563d6df6'::uuid, '9473e57a-92d0-4888-9df7-a1f87f727c4e'::uuid), -- s0pp
    ('42fc22f3-70a3-4a86-b829-4e95c35021df'::uuid, '9473e57a-92d0-4888-9df7-a1f87f727c4e'::uuid), -- sociablEE
    ('96694f5d-42b6-4129-a589-36fb158d9ecb'::uuid, '9473e57a-92d0-4888-9df7-a1f87f727c4e'::uuid), -- xeus
    ('16ebaa77-7241-4572-8385-0a275b9aaa7d'::uuid, '9473e57a-92d0-4888-9df7-a1f87f727c4e'::uuid), -- yetujey
    -- BBL Esports
    ('2403125c-2fb8-4fe6-8b47-96feade0f6f6'::uuid, 'ef2e67a0-bec3-41f9-b981-f18272603226'::uuid), -- Crewen
    ('15958b9f-a947-4cb6-870f-3ef74db00cf9'::uuid, 'ef2e67a0-bec3-41f9-b981-f18272603226'::uuid), -- Lar0k
    ('8247634f-57cc-4723-a394-1ec453d72820'::uuid, 'ef2e67a0-bec3-41f9-b981-f18272603226'::uuid), -- Loita
    ('1e5a702a-dbaf-4eaf-90e3-0328226f9fdc'::uuid, 'ef2e67a0-bec3-41f9-b981-f18272603226'::uuid), -- lovers rock
    ('0dddc88e-cb8d-4aea-a6eb-aeb57f5fdd2c'::uuid, 'ef2e67a0-bec3-41f9-b981-f18272603226'::uuid) -- Rosé
)
INSERT INTO public.vct_season_players (
  season_year,
  player_id,
  team_id,
  roster_status,
  market_eligible,
  source_url,
  confirmed_at
)
SELECT
  2027,
  retained_roster.player_id,
  retained_roster.team_id,
  'active',
  true,
  NULL,
  now()
FROM retained_roster
JOIN public.pro_players AS player
  ON player.id = retained_roster.player_id
 AND player.team_id = retained_roster.team_id
ON CONFLICT (season_year, player_id) DO UPDATE
SET team_id = EXCLUDED.team_id,
    roster_status = EXCLUDED.roster_status,
    market_eligible = EXCLUDED.market_eligible,
    source_url = EXCLUDED.source_url,
    confirmed_at = EXCLUDED.confirmed_at;

DO $validate_retained_emea_rosters$
DECLARE
  invalid_team_count integer;
BEGIN
  WITH expected(team_id, expected_players) AS (
    VALUES
      ('1bfb564a-3c49-4caf-8e26-d68df234f7e5'::uuid, 5),
      ('9473e57a-92d0-4888-9df7-a1f87f727c4e'::uuid, 5),
      ('ef2e67a0-bec3-41f9-b981-f18272603226'::uuid, 5)
  ), actual AS (
    SELECT season_player.team_id, count(*)::integer AS active_players
    FROM public.vct_season_players AS season_player
    WHERE season_player.season_year = 2027
      AND season_player.roster_status = 'active'
      AND season_player.market_eligible = true
      AND season_player.team_id IN (SELECT team_id FROM expected)
    GROUP BY season_player.team_id
  )
  SELECT count(*)
  INTO invalid_team_count
  FROM expected
  LEFT JOIN actual USING (team_id)
  WHERE COALESCE(actual.active_players, 0) <> expected.expected_players;

  IF invalid_team_count <> 0 THEN
    RAISE EXCEPTION
      'KC, FUT and BBL must each have exactly five eligible players';
  END IF;
END;
$validate_retained_emea_rosters$;

SELECT
  team.name,
  count(*)::integer AS confirmed_players
FROM public.vct_season_players AS season_player
JOIN public.pro_teams AS team ON team.id = season_player.team_id
WHERE season_player.season_year = 2027
  AND season_player.roster_status = 'active'
  AND season_player.market_eligible = true
  AND season_player.team_id IN (
    '1bfb564a-3c49-4caf-8e26-d68df234f7e5'::uuid,
    '9473e57a-92d0-4888-9df7-a1f87f727c4e'::uuid,
    'ef2e67a0-bec3-41f9-b981-f18272603226'::uuid
  )
GROUP BY team.name
ORDER BY team.name;
