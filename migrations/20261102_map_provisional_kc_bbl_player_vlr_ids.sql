-- Map the final 10 market-eligible VCT 2027 players without a VLR identity.
-- KC and BBL rosters remain provisional: this migration only identifies the
-- players and does not confirm their 2027 team membership or change status.

BEGIN;

CREATE TEMP TABLE _kc_bbl_vlr_player_mapping (
  player_id uuid PRIMARY KEY,
  expected_nickname text NOT NULL,
  expected_team_id uuid NOT NULL,
  vlr_id text NOT NULL UNIQUE
) ON COMMIT DROP;

INSERT INTO _kc_bbl_vlr_player_mapping (
  player_id,
  expected_nickname,
  expected_team_id,
  vlr_id
)
VALUES
  -- Karmine Corp
  ('ac4bf5dd-2b3d-46f6-a4bb-3d9964a08cf7', 'Avez', '1bfb564a-3c49-4caf-8e26-d68df234f7e5', '5654'),
  ('4204d293-902f-49ae-a230-b7bc869ad1e3', 'dos9', '1bfb564a-3c49-4caf-8e26-d68df234f7e5', '16215'),
  ('f5e1f094-ab78-41e1-8971-18d765092c79', 'LewN', '1bfb564a-3c49-4caf-8e26-d68df234f7e5', '20144'),
  ('7522a404-4982-4527-ab2b-1395f074f693', 'SUYGETSU', '1bfb564a-3c49-4caf-8e26-d68df234f7e5', '2858'),
  ('6f82c0fe-304e-4f73-bb4f-a8fb67a16f5a', 'N4RRATE', '1bfb564a-3c49-4caf-8e26-d68df234f7e5', '36245'),
  -- BBL Esports
  ('15958b9f-a947-4cb6-870f-3ef74db00cf9', 'Lar0k', 'ef2e67a0-bec3-41f9-b981-f18272603226', '31305'),
  ('8247634f-57cc-4723-a394-1ec453d72820', 'Loita', 'ef2e67a0-bec3-41f9-b981-f18272603226', '24344'),
  ('0dddc88e-cb8d-4aea-a6eb-aeb57f5fdd2c', 'Rosé', 'ef2e67a0-bec3-41f9-b981-f18272603226', '5565'),
  ('2403125c-2fb8-4fe6-8b47-96feade0f6f6', 'Crewen', 'ef2e67a0-bec3-41f9-b981-f18272603226', '12795'),
  ('1e5a702a-dbaf-4eaf-90e3-0328226f9fdc', 'lovers rock', 'ef2e67a0-bec3-41f9-b981-f18272603226', '40935');

DO $validate_kc_bbl_player_mapping$
DECLARE
  v_invalid_targets integer;
  v_invalid_season_rows integer;
  v_conflicting_ids integer;
BEGIN
  SELECT count(*)
    INTO v_invalid_targets
    FROM _kc_bbl_vlr_player_mapping AS mapping
    LEFT JOIN public.pro_players AS player ON player.id = mapping.player_id
   WHERE player.id IS NULL
      OR player.nickname <> mapping.expected_nickname
      OR player.team_id IS DISTINCT FROM mapping.expected_team_id;

  IF v_invalid_targets <> 0 THEN
    RAISE EXCEPTION
      'KC/BBL VLR mapping contains % missing, renamed or moved local targets',
      v_invalid_targets;
  END IF;

  SELECT count(*)
    INTO v_invalid_season_rows
    FROM _kc_bbl_vlr_player_mapping AS mapping
    LEFT JOIN public.vct_season_players AS season_player
      ON season_player.season_year = 2027
     AND season_player.player_id = mapping.player_id
     AND season_player.team_id = mapping.expected_team_id
     AND season_player.roster_status = 'active'
     AND season_player.market_eligible = true
   WHERE season_player.player_id IS NULL;

  IF v_invalid_season_rows <> 0 THEN
    RAISE EXCEPTION
      '% mapped KC/BBL players are not active and market eligible for their expected team',
      v_invalid_season_rows;
  END IF;

  SELECT count(*)
    INTO v_conflicting_ids
    FROM _kc_bbl_vlr_player_mapping AS mapping
    JOIN public.pro_players AS player ON player.vlr_id = mapping.vlr_id
   WHERE player.id <> mapping.player_id;

  IF v_conflicting_ids <> 0 THEN
    RAISE EXCEPTION
      'KC/BBL VLR mapping conflicts with % existing local players',
      v_conflicting_ids;
  END IF;
END;
$validate_kc_bbl_player_mapping$;

UPDATE public.pro_players AS player
   SET vlr_id = mapping.vlr_id
  FROM _kc_bbl_vlr_player_mapping AS mapping
 WHERE player.id = mapping.player_id
   AND player.vlr_id IS DISTINCT FROM mapping.vlr_id;

DO $verify_all_vct_2027_player_mappings$
DECLARE
  v_incorrect_mappings integer;
  v_eligible_without_vlr_id integer;
BEGIN
  SELECT count(*)
    INTO v_incorrect_mappings
    FROM _kc_bbl_vlr_player_mapping AS mapping
    JOIN public.pro_players AS player ON player.id = mapping.player_id
   WHERE player.vlr_id IS DISTINCT FROM mapping.vlr_id;

  IF v_incorrect_mappings <> 0 THEN
    RAISE EXCEPTION
      'Failed to persist % KC/BBL VLR player mappings',
      v_incorrect_mappings;
  END IF;

  SELECT count(*)
    INTO v_eligible_without_vlr_id
    FROM public.vct_season_players AS season_player
    JOIN public.vct_season_teams AS season_team
      ON season_team.season_year = season_player.season_year
     AND season_team.team_id = season_player.team_id
    JOIN public.pro_players AS player ON player.id = season_player.player_id
   WHERE season_player.season_year = 2027
     AND season_player.roster_status = 'active'
     AND season_player.market_eligible = true
     AND season_team.confirmation_status = 'confirmed'
     AND season_team.fantasy_eligible = true
     AND player.vlr_id IS NULL;

  IF v_eligible_without_vlr_id <> 0 THEN
    RAISE EXCEPTION
      '% active VCT 2027 market players still have no VLR id',
      v_eligible_without_vlr_id;
  END IF;
END;
$verify_all_vct_2027_player_mappings$;

COMMIT;

SELECT
  team.name AS team,
  player.nickname,
  player.vlr_id
FROM public.pro_players AS player
JOIN public.pro_teams AS team ON team.id = player.team_id
WHERE player.id IN (
  'ac4bf5dd-2b3d-46f6-a4bb-3d9964a08cf7',
  '4204d293-902f-49ae-a230-b7bc869ad1e3',
  'f5e1f094-ab78-41e1-8971-18d765092c79',
  '7522a404-4982-4527-ab2b-1395f074f693',
  '6f82c0fe-304e-4f73-bb4f-a8fb67a16f5a',
  '15958b9f-a947-4cb6-870f-3ef74db00cf9',
  '8247634f-57cc-4723-a394-1ec453d72820',
  '0dddc88e-cb8d-4aea-a6eb-aeb57f5fdd2c',
  '2403125c-2fb8-4fe6-8b47-96feade0f6f6',
  '1e5a702a-dbaf-4eaf-90e3-0328226f9fdc'
)
ORDER BY team.name, player.nickname;
