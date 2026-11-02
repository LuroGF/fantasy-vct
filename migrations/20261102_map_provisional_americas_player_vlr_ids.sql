-- Map the 39 currently market-eligible provisional Americas players that
-- still lack a VLR identity. This only sets pro_players.vlr_id and does not
-- confirm rosters or change fantasy eligibility/status.

BEGIN;

CREATE TEMP TABLE _americas_vlr_player_mapping (
  player_id uuid PRIMARY KEY,
  expected_nickname text NOT NULL,
  expected_team_id uuid NOT NULL,
  vlr_id text NOT NULL UNIQUE
) ON COMMIT DROP;

INSERT INTO _americas_vlr_player_mapping (
  player_id,
  expected_nickname,
  expected_team_id,
  vlr_id
)
VALUES
  -- 100 Thieves
  ('2c3f7e46-5430-4b1d-961b-fc8dfdc2e289', 'vora', '1e6b49b9-be4d-4f2b-a146-1ed7a9a6fbed', '20140'),
  ('4d50c9b2-7cd4-4e42-84d1-bb6a5cfadfa3', 'Cryocells', '1e6b49b9-be4d-4f2b-a146-1ed7a9a6fbed', '4147'),
  ('af461326-b489-41bd-bb5c-1d6f8e38fb5b', 'Asuna', '1e6b49b9-be4d-4f2b-a146-1ed7a9a6fbed', '601'),
  ('566e4fea-02a0-4044-9ba7-fdf561b73aba', 'Timotino', '1e6b49b9-be4d-4f2b-a146-1ed7a9a6fbed', '29893'),
  ('e6e1e17f-20bf-4e7f-9fda-f1aad580672b', 'bang', '1e6b49b9-be4d-4f2b-a146-1ed7a9a6fbed', '3880'),
  -- G2 Esports (valyn was mapped in the confirmed EMEA batch)
  ('25614104-54f7-4b24-a061-9f2f7d8a6c7e', 'jawgemo', 'd37fc5b1-af29-41c2-bb88-24abe4d8c96c', '3993'),
  ('8fb27866-a90a-49f1-b2b4-01251a3eb6ed', 'BABYBAY', 'd37fc5b1-af29-41c2-bb88-24abe4d8c96c', '2170'),
  ('eb017bad-5538-48cb-92fd-10b9d55601b5', 'trent', 'd37fc5b1-af29-41c2-bb88-24abe4d8c96c', '15500'),
  ('cb852692-8b6c-4026-9f79-92c23b94cedd', 'leaf', 'd37fc5b1-af29-41c2-bb88-24abe4d8c96c', '7873'),
  -- KRÜ Esports
  ('e7726509-a3da-4eab-9110-42b140d8aba7', 'Less', '70d535b4-7cfd-4526-8974-d108ca8566e7', '8447'),
  ('06060989-a916-480a-8889-1b99107f69b9', 'saadhak', '70d535b4-7cfd-4526-8974-d108ca8566e7', '727'),
  ('222e9ed2-f6cd-46b5-8594-dd6a2bd861c8', 'Dantedeu5', '70d535b4-7cfd-4526-8974-d108ca8566e7', '41135'),
  ('a328c049-bdc3-41f3-b42d-f631daf9f8a3', 'heat', '70d535b4-7cfd-4526-8974-d108ca8566e7', '8673'),
  ('2cf5f48b-ae5a-412b-a7d4-1b7344cef200', 'mwzera', '70d535b4-7cfd-4526-8974-d108ca8566e7', '939'),
  -- LEVIATÁN
  ('ab4765c4-530b-4864-a511-4b2db1d014f1', 'kiNgg', '54bf6e2b-a0a8-47b8-b93b-90a14eaef660', '8549'),
  ('4ebf897b-32ac-42ef-bc00-e12555eca51b', 'spike', '54bf6e2b-a0a8-47b8-b93b-90a14eaef660', '21661'),
  ('e3b69219-7d75-4cb2-9ceb-2dc8b90d2fce', 'blowz', '54bf6e2b-a0a8-47b8-b93b-90a14eaef660', '21251'),
  ('09b44c71-65df-415e-9b85-8ade0e72f9e4', 'Neon', '54bf6e2b-a0a8-47b8-b93b-90a14eaef660', '29243'),
  ('27b647d4-f6c1-4ec2-aaa0-9b7b0424d7b0', 'Sato', '54bf6e2b-a0a8-47b8-b93b-90a14eaef660', '21659'),
  -- LOUD
  ('6dabf896-3a5b-4d78-8ca7-b7fc2cda2a4a', 'erde', 'c8e9e66f-4fdd-4938-9ec7-ffd5de350128', '29242'),
  ('e3f336e7-1e91-4b04-ba17-c81b6bf07061', 'lukxo', 'c8e9e66f-4fdd-4938-9ec7-ffd5de350128', '28716'),
  ('ec37c56d-e417-417b-99d7-c1ac75cb7907', 'DaviH', 'c8e9e66f-4fdd-4938-9ec7-ffd5de350128', '10885'),
  ('2e05a1b7-9fa3-40fe-9935-7a36b7b94b32', 'Darker', 'c8e9e66f-4fdd-4938-9ec7-ffd5de350128', '10557'),
  ('19bc55c2-349d-4973-b532-0f30257f7014', 'tkzin', 'c8e9e66f-4fdd-4938-9ec7-ffd5de350128', '41224'),
  -- MIBR
  ('5d2094a7-7b3c-4421-aaef-5f29b48962df', 'tex', '2bcbfae3-03cc-4ee4-89a0-d1e579517525', '1818'),
  ('fc985780-c84b-40af-8fff-2e7c09e18cab', 'zekken', '2bcbfae3-03cc-4ee4-89a0-d1e579517525', '4004'),
  ('468d9d20-24d2-4e8a-b81d-a3b34c8b92b0', 'Mazino', '2bcbfae3-03cc-4ee4-89a0-d1e579517525', '7603'),
  ('0502f44f-8d43-4d57-9b57-275886b298ec', 'Verno', '2bcbfae3-03cc-4ee4-89a0-d1e579517525', '21668'),
  ('370717cf-e4a7-4991-9102-2bcc45134e6b', 'aspas', '2bcbfae3-03cc-4ee4-89a0-d1e579517525', '8480'),
  -- NRG
  ('00ef3447-d524-46b8-9c90-c4a7b9cccded', 'Ethan', 'cfd52166-eb08-4641-bfc4-3d9ace6b6756', '11225'),
  ('ebef352a-6fa3-477d-a284-bcfc643e044c', 'brawk', 'cfd52166-eb08-4641-bfc4-3d9ace6b6756', '2172'),
  ('a32ed65c-3716-4d6f-803f-50da399aa31a', 'mada', 'cfd52166-eb08-4641-bfc4-3d9ace6b6756', '5132'),
  ('0b6957b3-88ec-4aa7-b27c-cb286d81ab60', 'skuba', 'cfd52166-eb08-4641-bfc4-3d9ace6b6756', '11118'),
  ('d5573c10-9458-4785-a2e0-f024e2e49f01', 'keiko', 'cfd52166-eb08-4641-bfc4-3d9ace6b6756', '11494'),
  -- Sentinels
  ('79507310-95a9-4416-b07e-4ed6be79e3e8', 'johnqt', '01bcad97-b544-433f-98f1-efc0e4718f12', '1265'),
  ('98e79fe1-b199-4f0f-a7a0-c8263cad0e5d', 'Reduxx', '01bcad97-b544-433f-98f1-efc0e4718f12', '8419'),
  ('278b9d34-ff32-49d3-bd33-46118a796372', 'cortezia', '01bcad97-b544-433f-98f1-efc0e4718f12', '5395'),
  ('deac7e28-d1ee-480a-99d6-aac5f592a22e', 'Jerrwin', '01bcad97-b544-433f-98f1-efc0e4718f12', '34057'),
  ('a18e183c-c6a9-4cda-843d-34adc0d5d874', 'JonahP', '01bcad97-b544-433f-98f1-efc0e4718f12', '4581');

DO $validate_americas_player_mapping$
DECLARE
  v_invalid_targets integer;
  v_invalid_season_rows integer;
  v_conflicting_ids integer;
BEGIN
  SELECT count(*)
    INTO v_invalid_targets
    FROM _americas_vlr_player_mapping AS mapping
    LEFT JOIN public.pro_players AS player ON player.id = mapping.player_id
   WHERE player.id IS NULL
      OR player.nickname <> mapping.expected_nickname
      OR player.team_id IS DISTINCT FROM mapping.expected_team_id;

  IF v_invalid_targets <> 0 THEN
    RAISE EXCEPTION
      'Americas VLR mapping contains % missing, renamed or moved local targets',
      v_invalid_targets;
  END IF;

  SELECT count(*)
    INTO v_invalid_season_rows
    FROM _americas_vlr_player_mapping AS mapping
    LEFT JOIN public.vct_season_players AS season_player
      ON season_player.season_year = 2027
     AND season_player.player_id = mapping.player_id
     AND season_player.team_id = mapping.expected_team_id
     AND season_player.roster_status = 'active'
     AND season_player.market_eligible = true
   WHERE season_player.player_id IS NULL;

  IF v_invalid_season_rows <> 0 THEN
    RAISE EXCEPTION
      '% mapped Americas players are not active and market eligible for their expected team',
      v_invalid_season_rows;
  END IF;

  SELECT count(*)
    INTO v_conflicting_ids
    FROM _americas_vlr_player_mapping AS mapping
    JOIN public.pro_players AS player ON player.vlr_id = mapping.vlr_id
   WHERE player.id <> mapping.player_id;

  IF v_conflicting_ids <> 0 THEN
    RAISE EXCEPTION
      'Americas VLR mapping conflicts with % existing local players',
      v_conflicting_ids;
  END IF;
END;
$validate_americas_player_mapping$;

UPDATE public.pro_players AS player
   SET vlr_id = mapping.vlr_id
  FROM _americas_vlr_player_mapping AS mapping
 WHERE player.id = mapping.player_id
   AND player.vlr_id IS DISTINCT FROM mapping.vlr_id;

DO $verify_americas_player_mapping$
DECLARE
  v_incorrect_mappings integer;
BEGIN
  SELECT count(*)
    INTO v_incorrect_mappings
    FROM _americas_vlr_player_mapping AS mapping
    JOIN public.pro_players AS player ON player.id = mapping.player_id
   WHERE player.vlr_id IS DISTINCT FROM mapping.vlr_id;

  IF v_incorrect_mappings <> 0 THEN
    RAISE EXCEPTION
      'Failed to persist % Americas VLR player mappings',
      v_incorrect_mappings;
  END IF;
END;
$verify_americas_player_mapping$;

COMMIT;

SELECT
  team.name AS team,
  player.nickname,
  player.vlr_id
FROM public.vct_season_players AS season_player
JOIN public.pro_players AS player ON player.id = season_player.player_id
JOIN public.pro_teams AS team ON team.id = season_player.team_id
JOIN public.vct_season_teams AS season_team
  ON season_team.season_year = season_player.season_year
 AND season_team.team_id = season_player.team_id
WHERE season_player.season_year = 2027
  AND season_team.region = 'AMERICAS'
  AND season_player.roster_status = 'active'
  AND season_player.market_eligible = true
ORDER BY team.name, player.nickname;
