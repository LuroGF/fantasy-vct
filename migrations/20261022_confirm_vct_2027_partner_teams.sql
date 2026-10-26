-- VCT 2027: 32 organizaciones asociadas confirmadas.
-- Ocho equipos por región: Americas, EMEA, Pacific y China.
--
-- La temporada permanece en draft y los jugadores se cargan como candidatos
-- inactivos. Esta migración no activa todavía el mercado de 2027.

-- Tres organizaciones confirmadas todavía no existían en el catálogo local.
INSERT INTO public.pro_teams (
  id,
  name,
  tag,
  region,
  vlr_id,
  source_key
)
VALUES
  (
    '17e67e82-474d-45f2-af58-2437edd92b44'::uuid,
    'Crazy Raccoon',
    'CR',
    'pacific',
    '277',
    'vct-2027-partner:crazy-raccoon'
  ),
  (
    '1743ff9a-2082-4dc3-8379-6809d592f083'::uuid,
    'GAM Esports',
    'GAM',
    'pacific',
    NULL,
    'vct-2027-partner:gam-esports'
  ),
  (
    'fa0fd2f8-2af6-45b4-b09b-3d00138be00d'::uuid,
    'Weibo Gaming',
    'WBG',
    'china',
    '1224',
    'vct-2027-partner:weibo-gaming'
  )
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    tag = EXCLUDED.tag,
    region = EXCLUDED.region,
    vlr_id = EXCLUDED.vlr_id,
    source_key = EXCLUDED.source_key;

DO $validate_partner_teams$
DECLARE
  existing_teams integer;
BEGIN
  SELECT count(*)
    INTO existing_teams
    FROM public.pro_teams
   WHERE id IN (
     -- Americas
     'c8e9e66f-4fdd-4938-9ec7-ffd5de350128'::uuid,
     'd37fc5b1-af29-41c2-bb88-24abe4d8c96c'::uuid,
     'cfd52166-eb08-4641-bfc4-3d9ace6b6756'::uuid,
     '01bcad97-b544-433f-98f1-efc0e4718f12'::uuid,
     '70d535b4-7cfd-4526-8974-d108ca8566e7'::uuid,
     '54bf6e2b-a0a8-47b8-b93b-90a14eaef660'::uuid,
     '2bcbfae3-03cc-4ee4-89a0-d1e579517525'::uuid,
     '1e6b49b9-be4d-4f2b-a146-1ed7a9a6fbed'::uuid,
     -- EMEA
     '583929b8-34ef-427c-a2e7-2f95339da468'::uuid,
     'ef2e67a0-bec3-41f9-b981-f18272603226'::uuid,
     'a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid,
     '85194529-a796-47cf-a133-75f469de67dc'::uuid,
     '2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7'::uuid,
     '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid,
     '1bfb564a-3c49-4caf-8e26-d68df234f7e5'::uuid,
     '9473e57a-92d0-4888-9df7-a1f87f727c4e'::uuid,
     -- Pacific
     'fa251efe-7532-4564-a183-176e3a46d463'::uuid,
     '5d59025b-d24f-4cbd-94e6-83a3aced73ae'::uuid,
     '7530fa5c-a2bb-404c-bcb4-e0e0dc2f9fb0'::uuid,
     'af4496f8-ac9c-4b13-bf4b-9b4ec823619f'::uuid,
     '17e67e82-474d-45f2-af58-2437edd92b44'::uuid,
     '7d65838f-7591-4f0c-a711-eb23d7a0e8db'::uuid,
     '209258af-f62c-4059-998b-bee46b66b17a'::uuid,
     '1743ff9a-2082-4dc3-8379-6809d592f083'::uuid,
     -- China
     'b89ff9af-f477-4092-8012-bdb13a20d8e7'::uuid,
     'fa0fd2f8-2af6-45b4-b09b-3d00138be00d'::uuid,
     'da32b6cb-5dd4-477d-a815-2c71a24c96c9'::uuid,
     'cb1087de-6ae6-401c-9550-1f5ee9466592'::uuid,
     '484663c6-c1b9-483c-bb38-a0450276938a'::uuid,
     '84c3e569-5a21-4bd8-8b35-4dddde8cf0cd'::uuid,
     'd33e7f44-75e7-4cbb-9530-031fa2d850bd'::uuid,
     'f21f7d4b-70dd-49fd-8d41-bcd48d96b8b3'::uuid
   );

  IF existing_teams <> 32 THEN
    RAISE EXCEPTION
      'Expected all 32 canonical VCT 2027 partner teams, found %',
      existing_teams;
  END IF;
END;
$validate_partner_teams$;

INSERT INTO public.vct_seasons (year, name, status)
VALUES (2027, 'VCT 2027', 'draft')
ON CONFLICT (year) DO UPDATE
SET name = EXCLUDED.name;

WITH confirmed_partner(team_id, region) AS (
  VALUES
    -- Americas
    ('c8e9e66f-4fdd-4938-9ec7-ffd5de350128'::uuid, 'AMERICAS'), -- LOUD
    ('d37fc5b1-af29-41c2-bb88-24abe4d8c96c'::uuid, 'AMERICAS'), -- G2
    ('cfd52166-eb08-4641-bfc4-3d9ace6b6756'::uuid, 'AMERICAS'), -- NRG
    ('01bcad97-b544-433f-98f1-efc0e4718f12'::uuid, 'AMERICAS'), -- Sentinels
    ('70d535b4-7cfd-4526-8974-d108ca8566e7'::uuid, 'AMERICAS'), -- KRU
    ('54bf6e2b-a0a8-47b8-b93b-90a14eaef660'::uuid, 'AMERICAS'), -- Leviatan
    ('2bcbfae3-03cc-4ee4-89a0-d1e579517525'::uuid, 'AMERICAS'), -- MIBR
    ('1e6b49b9-be4d-4f2b-a146-1ed7a9a6fbed'::uuid, 'AMERICAS'), -- 100 Thieves
    -- EMEA
    ('583929b8-34ef-427c-a2e7-2f95339da468'::uuid, 'EMEA'), -- Team Heretics
    ('ef2e67a0-bec3-41f9-b981-f18272603226'::uuid, 'EMEA'), -- BBL
    ('a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid, 'EMEA'), -- FNATIC
    ('85194529-a796-47cf-a133-75f469de67dc'::uuid, 'EMEA'), -- Vitality
    ('2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7'::uuid, 'EMEA'), -- Liquid
    ('2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid, 'EMEA'), -- Gentle Mates
    ('1bfb564a-3c49-4caf-8e26-d68df234f7e5'::uuid, 'EMEA'), -- Karmine Corp
    ('9473e57a-92d0-4888-9df7-a1f87f727c4e'::uuid, 'EMEA'), -- FUT
    -- Pacific
    ('fa251efe-7532-4564-a183-176e3a46d463'::uuid, 'PACIFIC'), -- RRQ
    ('5d59025b-d24f-4cbd-94e6-83a3aced73ae'::uuid, 'PACIFIC'), -- FULL SENSE
    ('7530fa5c-a2bb-404c-bcb4-e0e0dc2f9fb0'::uuid, 'PACIFIC'), -- T1
    ('af4496f8-ac9c-4b13-bf4b-9b4ec823619f'::uuid, 'PACIFIC'), -- Paper Rex
    ('17e67e82-474d-45f2-af58-2437edd92b44'::uuid, 'PACIFIC'), -- Crazy Raccoon
    ('7d65838f-7591-4f0c-a711-eb23d7a0e8db'::uuid, 'PACIFIC'), -- ZETA
    ('209258af-f62c-4059-998b-bee46b66b17a'::uuid, 'PACIFIC'), -- Gen.G
    ('1743ff9a-2082-4dc3-8379-6809d592f083'::uuid, 'PACIFIC'), -- GAM
    -- China
    ('b89ff9af-f477-4092-8012-bdb13a20d8e7'::uuid, 'CHINA'), -- XLG
    ('fa0fd2f8-2af6-45b4-b09b-3d00138be00d'::uuid, 'CHINA'), -- Weibo
    ('da32b6cb-5dd4-477d-a815-2c71a24c96c9'::uuid, 'CHINA'), -- EDG
    ('cb1087de-6ae6-401c-9550-1f5ee9466592'::uuid, 'CHINA'), -- TYLOO
    ('484663c6-c1b9-483c-bb38-a0450276938a'::uuid, 'CHINA'), -- All Gamers
    ('84c3e569-5a21-4bd8-8b35-4dddde8cf0cd'::uuid, 'CHINA'), -- Trace
    ('d33e7f44-75e7-4cbb-9530-031fa2d850bd'::uuid, 'CHINA'), -- Bilibili
    ('f21f7d4b-70dd-49fd-8d41-bcd48d96b8b3'::uuid, 'CHINA') -- JDG
)
INSERT INTO public.vct_season_teams (
  season_year,
  team_id,
  region,
  confirmation_status,
  fantasy_eligible,
  source_url,
  confirmed_at
)
SELECT
  2027,
  confirmed_partner.team_id,
  confirmed_partner.region,
  'confirmed',
  true,
  'https://valorantesports.com/en-US/news/vct-2027-the-global-tour/',
  now()
FROM confirmed_partner
ON CONFLICT (season_year, team_id) DO UPDATE
SET region = EXCLUDED.region,
    confirmation_status = EXCLUDED.confirmation_status,
    fantasy_eligible = EXCLUDED.fantasy_eligible,
    source_url = EXCLUDED.source_url,
    confirmed_at = EXCLUDED.confirmed_at;

-- Conservamos cualquier borrador descartado, pero fuera del Fantasy 2027.
WITH confirmed_partner(team_id) AS (
  VALUES
    ('c8e9e66f-4fdd-4938-9ec7-ffd5de350128'::uuid),
    ('d37fc5b1-af29-41c2-bb88-24abe4d8c96c'::uuid),
    ('cfd52166-eb08-4641-bfc4-3d9ace6b6756'::uuid),
    ('01bcad97-b544-433f-98f1-efc0e4718f12'::uuid),
    ('70d535b4-7cfd-4526-8974-d108ca8566e7'::uuid),
    ('54bf6e2b-a0a8-47b8-b93b-90a14eaef660'::uuid),
    ('2bcbfae3-03cc-4ee4-89a0-d1e579517525'::uuid),
    ('1e6b49b9-be4d-4f2b-a146-1ed7a9a6fbed'::uuid),
    ('583929b8-34ef-427c-a2e7-2f95339da468'::uuid),
    ('ef2e67a0-bec3-41f9-b981-f18272603226'::uuid),
    ('a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid),
    ('85194529-a796-47cf-a133-75f469de67dc'::uuid),
    ('2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7'::uuid),
    ('2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid),
    ('1bfb564a-3c49-4caf-8e26-d68df234f7e5'::uuid),
    ('9473e57a-92d0-4888-9df7-a1f87f727c4e'::uuid),
    ('fa251efe-7532-4564-a183-176e3a46d463'::uuid),
    ('5d59025b-d24f-4cbd-94e6-83a3aced73ae'::uuid),
    ('7530fa5c-a2bb-404c-bcb4-e0e0dc2f9fb0'::uuid),
    ('af4496f8-ac9c-4b13-bf4b-9b4ec823619f'::uuid),
    ('17e67e82-474d-45f2-af58-2437edd92b44'::uuid),
    ('7d65838f-7591-4f0c-a711-eb23d7a0e8db'::uuid),
    ('209258af-f62c-4059-998b-bee46b66b17a'::uuid),
    ('1743ff9a-2082-4dc3-8379-6809d592f083'::uuid),
    ('b89ff9af-f477-4092-8012-bdb13a20d8e7'::uuid),
    ('fa0fd2f8-2af6-45b4-b09b-3d00138be00d'::uuid),
    ('da32b6cb-5dd4-477d-a815-2c71a24c96c9'::uuid),
    ('cb1087de-6ae6-401c-9550-1f5ee9466592'::uuid),
    ('484663c6-c1b9-483c-bb38-a0450276938a'::uuid),
    ('84c3e569-5a21-4bd8-8b35-4dddde8cf0cd'::uuid),
    ('d33e7f44-75e7-4cbb-9530-031fa2d850bd'::uuid),
    ('f21f7d4b-70dd-49fd-8d41-bcd48d96b8b3'::uuid)
)
UPDATE public.vct_season_teams AS season_team
   SET confirmation_status = 'removed',
       fantasy_eligible = false
 WHERE season_team.season_year = 2027
   AND NOT EXISTS (
     SELECT 1
       FROM confirmed_partner
      WHERE confirmed_partner.team_id = season_team.team_id
   );

-- Los jugadores actuales de los clubes asociados quedan preparados para
-- revisión, pero no confirmados ni elegibles hasta el anuncio de plantilla.
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
  player.id,
  player.team_id,
  'inactive',
  false,
  NULL,
  NULL
FROM public.pro_players AS player
JOIN public.vct_season_teams AS season_team
  ON season_team.season_year = 2027
 AND season_team.team_id = player.team_id
 AND season_team.confirmation_status = 'confirmed'
 AND season_team.fantasy_eligible = true
ON CONFLICT (season_year, player_id) DO NOTHING;

-- Resultado esperado: ocho filas por región y 32 en total.
SELECT
  season_team.region,
  count(*)::integer AS confirmed_teams
FROM public.vct_season_teams AS season_team
WHERE season_team.season_year = 2027
  AND season_team.confirmation_status = 'confirmed'
  AND season_team.fantasy_eligible = true
GROUP BY season_team.region
ORDER BY season_team.region;
