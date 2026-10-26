-- VCT EMEA 2027: primeras plantillas confirmadas manualmente.
--
-- Se cargan solamente los jugadores comunicados para Team Heretics,
-- FNATIC, Gentle Mates, Team Vitality y Team Liquid. Los huecos pendientes
-- de FNATIC y Liquid permanecen vacios y la temporada sigue en draft.

-- Jamppi pasa a Flex. Se asegura que la restriccion heredada admita ese rol.
ALTER TABLE public.pro_players
  DROP CONSTRAINT IF EXISTS pro_players_role_check;
ALTER TABLE public.pro_players
  ADD CONSTRAINT pro_players_role_check
  CHECK (role IN ('Duelista', 'Iniciador', 'Controlador', 'Centinela', 'Flex'));

-- Jugadores que aun no existian en el catalogo local.
WITH new_players(id, nickname, full_name, team_id, role, market_value, vlr_id) AS (
  VALUES
    (
      'f12f09e0-b435-4d64-ae78-6aac18e2c1a3'::uuid,
      'Jamelinho213',
      'Ryad Bentot',
      '583929b8-34ef-427c-a2e7-2f95339da468'::uuid,
      'Duelista',
      10000000::bigint,
      '57336'
    ),
    (
      '705b38c4-0367-45a7-80a0-c2181f831817'::uuid,
      'kozzy',
      'Denis Stefan Aionitoaei',
      '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid,
      'Duelista',
      10000000::bigint,
      '55681'
    ),
    (
      'a156629d-052d-4c13-b35d-e80d87522321'::uuid,
      'MAGNUM',
      'Martin Penkov',
      '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid,
      'Centinela',
      10000000::bigint,
      '2173'
    ),
    (
      '166c36f8-5a85-49b1-bd9b-7a9287ef0fc0'::uuid,
      'Kachoww',
      'Samet Arıcı',
      '2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7'::uuid,
      'Duelista',
      10000000::bigint,
      '58496'
    ),
    (
      'cb6f9003-5361-42c0-8f7f-f71eb450818b'::uuid,
      'GSR',
      'Ognjen Bondžić',
      '2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7'::uuid,
      'Flex',
      10000000::bigint,
      '50813'
    )
)
INSERT INTO public.pro_players (
  id,
  nickname,
  full_name,
  team_id,
  role,
  market_value,
  vlr_id
)
SELECT
  new_player.id,
  new_player.nickname,
  new_player.full_name,
  new_player.team_id,
  new_player.role,
  new_player.market_value,
  new_player.vlr_id
FROM new_players AS new_player
WHERE NOT EXISTS (
  SELECT 1
  FROM public.pro_players AS existing_player
  WHERE lower(existing_player.nickname) = lower(new_player.nickname)
     OR existing_player.vlr_id = new_player.vlr_id
);

-- La columna role solo se fuerza cuando se ha indicado un cambio o cuando
-- el jugador es nuevo. Los demas conservan su rol actual del catalogo.
WITH confirmed_roster(nickname, team_id, forced_role) AS (
  VALUES
    -- Team Heretics (5)
    ('hiro', '583929b8-34ef-427c-a2e7-2f95339da468'::uuid, NULL::text),
    ('Jamelinho213', '583929b8-34ef-427c-a2e7-2f95339da468'::uuid, 'Duelista'),
    ('RieNs', '583929b8-34ef-427c-a2e7-2f95339da468'::uuid, NULL::text),
    ('benjyfishy', '583929b8-34ef-427c-a2e7-2f95339da468'::uuid, NULL::text),
    ('chloric', '583929b8-34ef-427c-a2e7-2f95339da468'::uuid, NULL::text),
    -- FNATIC (4 de 5)
    ('kaajak', 'a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid, NULL::text),
    ('Cloud', 'a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid, NULL::text),
    ('marteen', 'a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid, NULL::text),
    ('Minny', 'a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid, NULL::text),
    -- Gentle Mates (5)
    ('Alfajer', '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid, NULL::text),
    ('kozzy', '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid, 'Duelista'),
    ('Ruxic', '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid, NULL::text),
    ('MAGNUM', '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid, 'Centinela'),
    ('Boaster', '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid, NULL::text),
    -- Team Vitality (5)
    ('Derke', '85194529-a796-47cf-a133-75f469de67dc'::uuid, NULL::text),
    ('Jamppi', '85194529-a796-47cf-a133-75f469de67dc'::uuid, 'Flex'),
    ('PROFEK', '85194529-a796-47cf-a133-75f469de67dc'::uuid, NULL::text),
    ('Chronicle', '85194529-a796-47cf-a133-75f469de67dc'::uuid, NULL::text),
    ('Sayonara', '85194529-a796-47cf-a133-75f469de67dc'::uuid, 'Iniciador'),
    -- Team Liquid (3 de 5)
    ('Kachoww', '2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7'::uuid, 'Duelista'),
    ('kamo', '2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7'::uuid, NULL::text),
    ('GSR', '2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7'::uuid, 'Flex')
)
UPDATE public.pro_players AS player
SET team_id = confirmed_roster.team_id,
    role = COALESCE(confirmed_roster.forced_role, player.role)
FROM confirmed_roster
WHERE lower(player.nickname) = lower(confirmed_roster.nickname);

-- Cualquier candidato anterior de estos cinco clubes deja de estar marcado
-- como elegible hasta que figure expresamente en la plantilla confirmada.
UPDATE public.vct_season_players
SET roster_status = 'inactive',
    market_eligible = false,
    confirmed_at = NULL
WHERE season_year = 2027
  AND team_id IN (
    '583929b8-34ef-427c-a2e7-2f95339da468'::uuid,
    'a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid,
    '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid,
    '85194529-a796-47cf-a133-75f469de67dc'::uuid,
    '2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7'::uuid
  );

WITH confirmed_roster(nickname, team_id) AS (
  VALUES
    ('hiro', '583929b8-34ef-427c-a2e7-2f95339da468'::uuid),
    ('Jamelinho213', '583929b8-34ef-427c-a2e7-2f95339da468'::uuid),
    ('RieNs', '583929b8-34ef-427c-a2e7-2f95339da468'::uuid),
    ('benjyfishy', '583929b8-34ef-427c-a2e7-2f95339da468'::uuid),
    ('chloric', '583929b8-34ef-427c-a2e7-2f95339da468'::uuid),
    ('kaajak', 'a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid),
    ('Cloud', 'a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid),
    ('marteen', 'a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid),
    ('Minny', 'a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid),
    ('Alfajer', '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid),
    ('kozzy', '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid),
    ('Ruxic', '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid),
    ('MAGNUM', '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid),
    ('Boaster', '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid),
    ('Derke', '85194529-a796-47cf-a133-75f469de67dc'::uuid),
    ('Jamppi', '85194529-a796-47cf-a133-75f469de67dc'::uuid),
    ('PROFEK', '85194529-a796-47cf-a133-75f469de67dc'::uuid),
    ('Chronicle', '85194529-a796-47cf-a133-75f469de67dc'::uuid),
    ('Sayonara', '85194529-a796-47cf-a133-75f469de67dc'::uuid),
    ('Kachoww', '2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7'::uuid),
    ('kamo', '2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7'::uuid),
    ('GSR', '2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7'::uuid)
), resolved_roster AS (
  SELECT player.id AS player_id, confirmed_roster.team_id
  FROM confirmed_roster
  JOIN public.pro_players AS player
    ON lower(player.nickname) = lower(confirmed_roster.nickname)
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
  resolved_roster.player_id,
  resolved_roster.team_id,
  'active',
  true,
  NULL,
  now()
FROM resolved_roster
ON CONFLICT (season_year, player_id) DO UPDATE
SET team_id = EXCLUDED.team_id,
    roster_status = EXCLUDED.roster_status,
    market_eligible = EXCLUDED.market_eligible,
    source_url = EXCLUDED.source_url,
    confirmed_at = EXCLUDED.confirmed_at;

DO $validate_partial_emea_rosters$
DECLARE
  confirmed_players integer;
BEGIN
  SELECT count(*)
  INTO confirmed_players
  FROM public.vct_season_players AS season_player
  WHERE season_player.season_year = 2027
    AND season_player.roster_status = 'active'
    AND season_player.market_eligible = true
    AND season_player.team_id IN (
      '583929b8-34ef-427c-a2e7-2f95339da468'::uuid,
      'a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid,
      '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid,
      '85194529-a796-47cf-a133-75f469de67dc'::uuid,
      '2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7'::uuid
    );

  IF confirmed_players <> 22 THEN
    RAISE EXCEPTION
      'Expected 22 confirmed EMEA players in the partial roster, found %',
      confirmed_players;
  END IF;
END;
$validate_partial_emea_rosters$;

SELECT
  team.name,
  count(*)::integer AS confirmed_players
FROM public.vct_season_players AS season_player
JOIN public.pro_teams AS team ON team.id = season_player.team_id
WHERE season_player.season_year = 2027
  AND season_player.roster_status = 'active'
  AND season_player.market_eligible = true
  AND season_player.team_id IN (
    '583929b8-34ef-427c-a2e7-2f95339da468'::uuid,
    'a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid,
    '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid,
    '85194529-a796-47cf-a133-75f469de67dc'::uuid,
    '2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7'::uuid
  )
GROUP BY team.name
ORDER BY team.name;
