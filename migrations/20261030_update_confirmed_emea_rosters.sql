-- VCT EMEA 2027: actualización de plantillas comunicada el 30/10/2026.
--
-- FNATIC y Gentle Mates quedan completos.
-- FUT sustituye a s0pp por wo0t.
-- Team Liquid queda con cuatro jugadores confirmados y una plaza pendiente.
-- Team Vitality queda sin Derke y con una plaza pendiente.
-- Karmine Corp y BBL Esports no se modifican.

BEGIN;

-- Corrección del alias provisional introducido como GSR.
UPDATE public.pro_players
SET nickname = 'gst'
WHERE id = 'cb6f9003-5361-42c0-8f7f-f71eb450818b'::uuid;

-- Limpiamos únicamente los cinco clubes afectados. Los jugadores que salen
-- quedan sin equipo y, por tanto, fuera del mercado hasta una nueva confirmación.
UPDATE public.pro_players
SET team_id = NULL
WHERE team_id IN (
  'a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid, -- FNATIC
  '2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7'::uuid, -- Team Liquid
  '9473e57a-92d0-4888-9df7-a1f87f727c4e'::uuid, -- FUT Esports
  '85194529-a796-47cf-a133-75f469de67dc'::uuid, -- Team Vitality
  '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid  -- Gentle Mates
);

WITH confirmed_roster(player_id, team_id) AS (
  VALUES
    -- FNATIC (5)
    ('f1d4e6fe-9989-4308-aafb-7ef677990fdc'::uuid, 'a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid), -- kaajak
    ('9488d4bf-8e9a-4484-95e2-6e1abcbd6eed'::uuid, 'a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid), -- Cloud
    ('8b69fb76-9db3-4af5-9ca0-15cf64841512'::uuid, 'a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid), -- marteen
    ('12d4bd61-8c43-49bb-8cf1-255e09b5a233'::uuid, 'a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid), -- Minny
    ('00929c56-909c-4760-a8be-6628ebd59b92'::uuid, 'a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid), -- valyn

    -- Team Liquid (4; una plaza pendiente)
    ('166c36f8-5a85-49b1-bd9b-7a9287ef0fc0'::uuid, '2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7'::uuid), -- Kachoww
    ('bce46672-4120-404e-9caa-4bd68ffce131'::uuid, '2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7'::uuid), -- kamo
    ('cb6f9003-5361-42c0-8f7f-f71eb450818b'::uuid, '2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7'::uuid), -- gst
    ('ac710fa3-f2e8-42b1-8366-4bf50b79ad4c'::uuid, '2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7'::uuid), -- nAts

    -- FUT Esports (5)
    ('96694f5d-42b6-4129-a589-36fb158d9ecb'::uuid, '9473e57a-92d0-4888-9df7-a1f87f727c4e'::uuid), -- xeus
    ('b84c5218-bf89-41ad-8e3b-5642ba2b0b71'::uuid, '9473e57a-92d0-4888-9df7-a1f87f727c4e'::uuid), -- KROSTALY
    ('42fc22f3-70a3-4a86-b829-4e95c35021df'::uuid, '9473e57a-92d0-4888-9df7-a1f87f727c4e'::uuid), -- sociablEE
    ('16ebaa77-7241-4572-8385-0a275b9aaa7d'::uuid, '9473e57a-92d0-4888-9df7-a1f87f727c4e'::uuid), -- yetujey
    ('83192dea-781d-4f7b-bcc0-9d48e78c3c75'::uuid, '9473e57a-92d0-4888-9df7-a1f87f727c4e'::uuid), -- wo0t

    -- Team Vitality (4; una plaza pendiente)
    ('ef20f8c4-43ab-4fa1-b65d-e1693a6c071f'::uuid, '85194529-a796-47cf-a133-75f469de67dc'::uuid), -- Jamppi
    ('07a58737-d5d9-4cb9-ad79-6cd1b505e82b'::uuid, '85194529-a796-47cf-a133-75f469de67dc'::uuid), -- PROFEK
    ('8de29426-632e-415f-97dd-d58e227b082b'::uuid, '85194529-a796-47cf-a133-75f469de67dc'::uuid), -- Chronicle
    ('c827998a-e83f-482b-a63a-74cc01dce50c'::uuid, '85194529-a796-47cf-a133-75f469de67dc'::uuid), -- Sayonara

    -- Gentle Mates (5)
    ('ec0b84b9-9fb6-43a9-bc21-c22eb922fac6'::uuid, '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid), -- Alfajer
    ('705b38c4-0367-45a7-80a0-c2181f831817'::uuid, '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid), -- kozzy
    ('d72e576a-3c20-450b-99de-372e95c2a68d'::uuid, '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid), -- Ruxic
    ('a156629d-052d-4c13-b35d-e80d87522321'::uuid, '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid), -- MAGNUM
    ('2fd317e1-7db8-48e0-9d83-c7c2e620c95c'::uuid, '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid)  -- Boaster
)
UPDATE public.pro_players AS player
SET team_id = confirmed_roster.team_id
FROM confirmed_roster
WHERE player.id = confirmed_roster.player_id;

-- Desactivamos el estado anterior de los cinco clubes y reconstruimos solo
-- las filas confirmadas. KC y BBL quedan fuera de este alcance.
UPDATE public.vct_season_players
SET roster_status = 'inactive',
    market_eligible = false,
    confirmed_at = NULL
WHERE season_year = 2027
  AND team_id IN (
    'a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid,
    '2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7'::uuid,
    '9473e57a-92d0-4888-9df7-a1f87f727c4e'::uuid,
    '85194529-a796-47cf-a133-75f469de67dc'::uuid,
    '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid
  );

WITH confirmed_roster(player_id, team_id) AS (
  VALUES
    ('f1d4e6fe-9989-4308-aafb-7ef677990fdc'::uuid, 'a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid),
    ('9488d4bf-8e9a-4484-95e2-6e1abcbd6eed'::uuid, 'a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid),
    ('8b69fb76-9db3-4af5-9ca0-15cf64841512'::uuid, 'a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid),
    ('12d4bd61-8c43-49bb-8cf1-255e09b5a233'::uuid, 'a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid),
    ('00929c56-909c-4760-a8be-6628ebd59b92'::uuid, 'a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid),
    ('166c36f8-5a85-49b1-bd9b-7a9287ef0fc0'::uuid, '2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7'::uuid),
    ('bce46672-4120-404e-9caa-4bd68ffce131'::uuid, '2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7'::uuid),
    ('cb6f9003-5361-42c0-8f7f-f71eb450818b'::uuid, '2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7'::uuid),
    ('ac710fa3-f2e8-42b1-8366-4bf50b79ad4c'::uuid, '2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7'::uuid),
    ('96694f5d-42b6-4129-a589-36fb158d9ecb'::uuid, '9473e57a-92d0-4888-9df7-a1f87f727c4e'::uuid),
    ('b84c5218-bf89-41ad-8e3b-5642ba2b0b71'::uuid, '9473e57a-92d0-4888-9df7-a1f87f727c4e'::uuid),
    ('42fc22f3-70a3-4a86-b829-4e95c35021df'::uuid, '9473e57a-92d0-4888-9df7-a1f87f727c4e'::uuid),
    ('16ebaa77-7241-4572-8385-0a275b9aaa7d'::uuid, '9473e57a-92d0-4888-9df7-a1f87f727c4e'::uuid),
    ('83192dea-781d-4f7b-bcc0-9d48e78c3c75'::uuid, '9473e57a-92d0-4888-9df7-a1f87f727c4e'::uuid),
    ('ef20f8c4-43ab-4fa1-b65d-e1693a6c071f'::uuid, '85194529-a796-47cf-a133-75f469de67dc'::uuid),
    ('07a58737-d5d9-4cb9-ad79-6cd1b505e82b'::uuid, '85194529-a796-47cf-a133-75f469de67dc'::uuid),
    ('8de29426-632e-415f-97dd-d58e227b082b'::uuid, '85194529-a796-47cf-a133-75f469de67dc'::uuid),
    ('c827998a-e83f-482b-a63a-74cc01dce50c'::uuid, '85194529-a796-47cf-a133-75f469de67dc'::uuid),
    ('ec0b84b9-9fb6-43a9-bc21-c22eb922fac6'::uuid, '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid),
    ('705b38c4-0367-45a7-80a0-c2181f831817'::uuid, '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid),
    ('d72e576a-3c20-450b-99de-372e95c2a68d'::uuid, '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid),
    ('a156629d-052d-4c13-b35d-e80d87522321'::uuid, '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid),
    ('2fd317e1-7db8-48e0-9d83-c7c2e620c95c'::uuid, '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid)
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
  confirmed_roster.player_id,
  confirmed_roster.team_id,
  'active',
  true,
  NULL,
  now()
FROM confirmed_roster
ON CONFLICT (season_year, player_id) DO UPDATE
SET team_id = EXCLUDED.team_id,
    roster_status = EXCLUDED.roster_status,
    market_eligible = EXCLUDED.market_eligible,
    source_url = EXCLUDED.source_url,
    confirmed_at = EXCLUDED.confirmed_at;

DO $validate_updated_emea_rosters$
DECLARE
  invalid_team_count integer;
  removed_player_count integer;
BEGIN
  WITH expected(team_id, expected_players) AS (
    VALUES
      ('a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid, 5),
      ('2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7'::uuid, 4),
      ('9473e57a-92d0-4888-9df7-a1f87f727c4e'::uuid, 5),
      ('85194529-a796-47cf-a133-75f469de67dc'::uuid, 4),
      ('2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid, 5)
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
    RAISE EXCEPTION 'Updated EMEA rosters do not match the expected 5/4/5/4/5 distribution';
  END IF;

  SELECT count(*)
  INTO removed_player_count
  FROM public.pro_players AS player
  LEFT JOIN public.vct_season_players AS season_player
    ON season_player.season_year = 2027
   AND season_player.player_id = player.id
  WHERE player.id IN (
      'd7b4f702-1070-4817-95fd-8c1e563d6df6'::uuid, -- s0pp
      '21e1dd2c-a102-4b79-b4d1-0e7d31a721f2'::uuid  -- Derke
    )
    AND (
      player.team_id IS NOT NULL
      OR season_player.roster_status <> 'inactive'
      OR season_player.market_eligible = true
    );

  IF removed_player_count <> 0 THEN
    RAISE EXCEPTION 's0pp and Derke must be unassigned and ineligible';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.pro_players
    WHERE id = 'cb6f9003-5361-42c0-8f7f-f71eb450818b'::uuid
      AND nickname = 'gst'
  ) THEN
    RAISE EXCEPTION 'The Team Liquid alias correction from GSR to gst was not applied';
  END IF;
END;
$validate_updated_emea_rosters$;

COMMIT;

SELECT
  team.name,
  count(*)::integer AS confirmed_players,
  string_agg(player.nickname, ', ' ORDER BY lower(player.nickname)) AS roster
FROM public.vct_season_players AS season_player
JOIN public.pro_players AS player ON player.id = season_player.player_id
JOIN public.pro_teams AS team ON team.id = season_player.team_id
WHERE season_player.season_year = 2027
  AND season_player.roster_status = 'active'
  AND season_player.market_eligible = true
  AND season_player.team_id IN (
    'a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid,
    '2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7'::uuid,
    '9473e57a-92d0-4888-9df7-a1f87f727c4e'::uuid,
    '85194529-a796-47cf-a133-75f469de67dc'::uuid,
    '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid
  )
GROUP BY team.name
ORDER BY team.name;
