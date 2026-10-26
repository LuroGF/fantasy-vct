-- VCT 2027: ocho organizaciones asociadas confirmadas para EMEA.
--
-- Esta migración NO activa todavía la temporada 2027 y NO hace elegibles a
-- jugadores. Conserva el Fantasy actual mientras se anuncian las plantillas.

DO $validate_emea_teams$
DECLARE
  existing_teams integer;
BEGIN
  SELECT count(*)
    INTO existing_teams
    FROM public.pro_teams
   WHERE id IN (
     '583929b8-34ef-427c-a2e7-2f95339da468'::uuid, -- Team Heretics
     'ef2e67a0-bec3-41f9-b981-f18272603226'::uuid, -- BBL Esports
     'a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid, -- FNATIC
     '85194529-a796-47cf-a133-75f469de67dc'::uuid, -- Team Vitality
     '2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7'::uuid, -- Team Liquid (canónico)
     '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid, -- Gentle Mates
     '1bfb564a-3c49-4caf-8e26-d68df234f7e5'::uuid, -- Karmine Corp
     '9473e57a-92d0-4888-9df7-a1f87f727c4e'::uuid  -- FUT Esports
   );

  IF existing_teams <> 8 THEN
    RAISE EXCEPTION
      'Expected all 8 canonical EMEA teams, found %',
      existing_teams;
  END IF;
END;
$validate_emea_teams$;

INSERT INTO public.vct_seasons (year, name, status)
VALUES (2027, 'VCT 2027', 'draft')
ON CONFLICT (year) DO UPDATE
SET name = EXCLUDED.name;

WITH confirmed_team(team_id) AS (
  VALUES
    ('583929b8-34ef-427c-a2e7-2f95339da468'::uuid),
    ('ef2e67a0-bec3-41f9-b981-f18272603226'::uuid),
    ('a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid),
    ('85194529-a796-47cf-a133-75f469de67dc'::uuid),
    ('2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7'::uuid),
    ('2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid),
    ('1bfb564a-3c49-4caf-8e26-d68df234f7e5'::uuid),
    ('9473e57a-92d0-4888-9df7-a1f87f727c4e'::uuid)
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
  confirmed_team.team_id,
  'EMEA',
  'confirmed',
  true,
  'https://valorantesports.com/en-US/news/vct-2027-the-global-tour/',
  now()
FROM confirmed_team
ON CONFLICT (season_year, team_id) DO UPDATE
SET region = EXCLUDED.region,
    confirmation_status = EXCLUDED.confirmation_status,
    fantasy_eligible = EXCLUDED.fantasy_eligible,
    source_url = EXCLUDED.source_url,
    confirmed_at = EXCLUDED.confirmed_at;

-- Si se había cargado algún borrador filtrado, se conserva como histórico
-- pero queda expresamente fuera del grupo asociado de EMEA.
UPDATE public.vct_season_teams
   SET confirmation_status = 'removed',
       fantasy_eligible = false
 WHERE season_year = 2027
   AND region = 'EMEA'
   AND team_id NOT IN (
     '583929b8-34ef-427c-a2e7-2f95339da468'::uuid,
     'ef2e67a0-bec3-41f9-b981-f18272603226'::uuid,
     'a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid,
     '85194529-a796-47cf-a133-75f469de67dc'::uuid,
     '2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7'::uuid,
     '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid,
     '1bfb564a-3c49-4caf-8e26-d68df234f7e5'::uuid,
     '9473e57a-92d0-4888-9df7-a1f87f727c4e'::uuid
   );

-- Preparamos los jugadores actualmente asociados a estos clubes como
-- candidatos de revisión. No se consideran plantilla 2027 confirmada, no
-- aparecen en el mercado estacional y podrán promoverse uno a uno cuando el
-- club publique su anuncio oficial.
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
WHERE player.team_id IN (
  '583929b8-34ef-427c-a2e7-2f95339da468'::uuid,
  'ef2e67a0-bec3-41f9-b981-f18272603226'::uuid,
  'a7603da1-0364-4f60-befd-0ab1edd5e4cb'::uuid,
  '85194529-a796-47cf-a133-75f469de67dc'::uuid,
  '2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7'::uuid,
  '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47'::uuid,
  '1bfb564a-3c49-4caf-8e26-d68df234f7e5'::uuid,
  '9473e57a-92d0-4888-9df7-a1f87f727c4e'::uuid
)
ON CONFLICT (season_year, player_id) DO NOTHING;

-- Verificación legible al ejecutar el script en Supabase.
SELECT
  team.name,
  team.tag,
  season_team.region,
  season_team.confirmation_status,
  season_team.fantasy_eligible
FROM public.vct_season_teams AS season_team
JOIN public.pro_teams AS team
  ON team.id = season_team.team_id
WHERE season_team.season_year = 2027
  AND season_team.region = 'EMEA'
ORDER BY team.name;
