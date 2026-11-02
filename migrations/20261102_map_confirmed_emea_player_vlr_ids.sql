-- Map the 28 currently confirmed 2027 players for Team Heretics, FNATIC,
-- Gentle Mates, Team Vitality, Team Liquid and FUT Esports to their canonical
-- VLR profiles. IDs were verified directly against VLR player pages on
-- 2026-11-02. KC and BBL are intentionally excluded until their 2027 rosters
-- are confirmed.

BEGIN;

CREATE TEMP TABLE _confirmed_emea_vlr_player_mapping (
  player_id uuid PRIMARY KEY,
  expected_nickname text NOT NULL,
  expected_team_id uuid NOT NULL,
  vlr_id text NOT NULL UNIQUE
) ON COMMIT DROP;

INSERT INTO _confirmed_emea_vlr_player_mapping (
  player_id,
  expected_nickname,
  expected_team_id,
  vlr_id
)
VALUES
  -- Team Heretics
  ('b07105e3-1cb5-41a1-9d9c-a3db13210846', 'hiro', '583929b8-34ef-427c-a2e7-2f95339da468', '29867'),
  ('f12f09e0-b435-4d64-ae78-6aac18e2c1a3', 'Jamelinho213', '583929b8-34ef-427c-a2e7-2f95339da468', '57336'),
  ('064e6349-4d19-432c-9009-22c8614f3256', 'RieNs', '583929b8-34ef-427c-a2e7-2f95339da468', '10971'),
  ('a9c219c3-ac2d-41e6-9882-e2fbcdd21658', 'benjyfishy', '583929b8-34ef-427c-a2e7-2f95339da468', '29873'),
  ('a4907f79-1a20-419a-8b3f-f9dc5e9aa522', 'chloric', '583929b8-34ef-427c-a2e7-2f95339da468', '15639'),
  -- FNATIC
  ('f1d4e6fe-9989-4308-aafb-7ef677990fdc', 'kaajak', 'a7603da1-0364-4f60-befd-0ab1edd5e4cb', '9554'),
  ('9488d4bf-8e9a-4484-95e2-6e1abcbd6eed', 'Cloud', 'a7603da1-0364-4f60-befd-0ab1edd5e4cb', '4181'),
  ('8b69fb76-9db3-4af5-9ca0-15cf64841512', 'marteen', 'a7603da1-0364-4f60-befd-0ab1edd5e4cb', '10307'),
  ('12d4bd61-8c43-49bb-8cf1-255e09b5a233', 'Minny', 'a7603da1-0364-4f60-befd-0ab1edd5e4cb', '23169'),
  ('00929c56-909c-4760-a8be-6628ebd59b92', 'valyn', 'a7603da1-0364-4f60-befd-0ab1edd5e4cb', '3885'),
  -- Gentle Mates
  ('ec0b84b9-9fb6-43a9-bc21-c22eb922fac6', 'Alfajer', '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47', '9810'),
  ('705b38c4-0367-45a7-80a0-c2181f831817', 'kozzy', '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47', '55681'),
  ('d72e576a-3c20-450b-99de-372e95c2a68d', 'Ruxic', '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47', '18677'),
  ('a156629d-052d-4c13-b35d-e80d87522321', 'MAGNUM', '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47', '2173'),
  ('2fd317e1-7db8-48e0-9d83-c7c2e620c95c', 'Boaster', '2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47', '438'),
  -- Team Vitality (four confirmed, one slot pending)
  ('8de29426-632e-415f-97dd-d58e227b082b', 'Chronicle', '85194529-a796-47cf-a133-75f469de67dc', '458'),
  ('ef20f8c4-43ab-4fa1-b65d-e1693a6c071f', 'Jamppi', '85194529-a796-47cf-a133-75f469de67dc', '9780'),
  ('07a58737-d5d9-4cb9-ad79-6cd1b505e82b', 'PROFEK', '85194529-a796-47cf-a133-75f469de67dc', '5554'),
  ('c827998a-e83f-482b-a63a-74cc01dce50c', 'Sayonara', '85194529-a796-47cf-a133-75f469de67dc', '33902'),
  -- Team Liquid (four confirmed, one slot pending)
  ('166c36f8-5a85-49b1-bd9b-7a9287ef0fc0', 'Kachoww', '2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7', '58496'),
  ('bce46672-4120-404e-9caa-4bd68ffce131', 'kamo', '2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7', '14681'),
  ('cb6f9003-5361-42c0-8f7f-f71eb450818b', 'gst', '2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7', '50813'),
  ('ac710fa3-f2e8-42b1-8366-4bf50b79ad4c', 'nAts', '2c3c2a79-14a4-49b7-8658-fb3f8dfe84c7', '457'),
  -- FUT Esports
  ('96694f5d-42b6-4129-a589-36fb158d9ecb', 'xeus', '9473e57a-92d0-4888-9df7-a1f87f727c4e', '12793'),
  ('b84c5218-bf89-41ad-8e3b-5642ba2b0b71', 'KROSTALY', '9473e57a-92d0-4888-9df7-a1f87f727c4e', '15735'),
  ('42fc22f3-70a3-4a86-b829-4e95c35021df', 'sociablEE', '9473e57a-92d0-4888-9df7-a1f87f727c4e', '5568'),
  ('16ebaa77-7241-4572-8385-0a275b9aaa7d', 'yetujey', '9473e57a-92d0-4888-9df7-a1f87f727c4e', '8369'),
  ('83192dea-781d-4f7b-bcc0-9d48e78c3c75', 'Wo0t', '9473e57a-92d0-4888-9df7-a1f87f727c4e', '21328');

DO $validate_confirmed_emea_player_mapping$
DECLARE
  v_invalid_targets integer;
  v_invalid_season_rows integer;
  v_conflicting_ids integer;
BEGIN
  SELECT count(*)
    INTO v_invalid_targets
    FROM _confirmed_emea_vlr_player_mapping AS mapping
    LEFT JOIN public.pro_players AS player ON player.id = mapping.player_id
   WHERE player.id IS NULL
      OR player.nickname <> mapping.expected_nickname
      OR player.team_id IS DISTINCT FROM mapping.expected_team_id;

  IF v_invalid_targets <> 0 THEN
    RAISE EXCEPTION
      'VLR player mapping contains % missing, renamed or moved local targets',
      v_invalid_targets;
  END IF;

  SELECT count(*)
    INTO v_invalid_season_rows
    FROM _confirmed_emea_vlr_player_mapping AS mapping
    LEFT JOIN public.vct_season_players AS season_player
      ON season_player.season_year = 2027
     AND season_player.player_id = mapping.player_id
     AND season_player.team_id = mapping.expected_team_id
     AND season_player.roster_status = 'active'
     AND season_player.market_eligible = true
   WHERE season_player.player_id IS NULL;

  IF v_invalid_season_rows <> 0 THEN
    RAISE EXCEPTION
      '% mapped players are not active and market eligible for their expected VCT 2027 team',
      v_invalid_season_rows;
  END IF;

  SELECT count(*)
    INTO v_conflicting_ids
    FROM _confirmed_emea_vlr_player_mapping AS mapping
    JOIN public.pro_players AS player ON player.vlr_id = mapping.vlr_id
   WHERE player.id <> mapping.player_id;

  IF v_conflicting_ids <> 0 THEN
    RAISE EXCEPTION
      'VLR player mapping conflicts with % existing local players',
      v_conflicting_ids;
  END IF;
END;
$validate_confirmed_emea_player_mapping$;

UPDATE public.pro_players AS player
   SET vlr_id = mapping.vlr_id
  FROM _confirmed_emea_vlr_player_mapping AS mapping
 WHERE player.id = mapping.player_id
   AND player.vlr_id IS DISTINCT FROM mapping.vlr_id;

DO $verify_confirmed_emea_player_mapping$
DECLARE
  v_incorrect_mappings integer;
BEGIN
  SELECT count(*)
    INTO v_incorrect_mappings
    FROM _confirmed_emea_vlr_player_mapping AS mapping
    JOIN public.pro_players AS player ON player.id = mapping.player_id
   WHERE player.vlr_id IS DISTINCT FROM mapping.vlr_id;

  IF v_incorrect_mappings <> 0 THEN
    RAISE EXCEPTION
      'Failed to persist % confirmed EMEA VLR player mappings',
      v_incorrect_mappings;
  END IF;
END;
$verify_confirmed_emea_player_mapping$;

COMMIT;

SELECT
  team.name AS team,
  player.nickname,
  player.vlr_id
FROM public.pro_players AS player
JOIN public.pro_teams AS team ON team.id = player.team_id
WHERE player.id IN (
  'b07105e3-1cb5-41a1-9d9c-a3db13210846',
  'f12f09e0-b435-4d64-ae78-6aac18e2c1a3',
  '064e6349-4d19-432c-9009-22c8614f3256',
  'a9c219c3-ac2d-41e6-9882-e2fbcdd21658',
  'a4907f79-1a20-419a-8b3f-f9dc5e9aa522',
  'f1d4e6fe-9989-4308-aafb-7ef677990fdc',
  '9488d4bf-8e9a-4484-95e2-6e1abcbd6eed',
  '8b69fb76-9db3-4af5-9ca0-15cf64841512',
  '12d4bd61-8c43-49bb-8cf1-255e09b5a233',
  '00929c56-909c-4760-a8be-6628ebd59b92',
  'ec0b84b9-9fb6-43a9-bc21-c22eb922fac6',
  '705b38c4-0367-45a7-80a0-c2181f831817',
  'd72e576a-3c20-450b-99de-372e95c2a68d',
  'a156629d-052d-4c13-b35d-e80d87522321',
  '2fd317e1-7db8-48e0-9d83-c7c2e620c95c',
  '8de29426-632e-415f-97dd-d58e227b082b',
  'ef20f8c4-43ab-4fa1-b65d-e1693a6c071f',
  '07a58737-d5d9-4cb9-ad79-6cd1b505e82b',
  'c827998a-e83f-482b-a63a-74cc01dce50c',
  '166c36f8-5a85-49b1-bd9b-7a9287ef0fc0',
  'bce46672-4120-404e-9caa-4bd68ffce131',
  'cb6f9003-5361-42c0-8f7f-f71eb450818b',
  'ac710fa3-f2e8-42b1-8366-4bf50b79ad4c',
  '96694f5d-42b6-4129-a589-36fb158d9ecb',
  'b84c5218-bf89-41ad-8e3b-5642ba2b0b71',
  '42fc22f3-70a3-4a86-b829-4e95c35021df',
  '16ebaa77-7241-4572-8385-0a275b9aaa7d',
  '83192dea-781d-4f7b-bcc0-9d48e78c3c75'
)
ORDER BY team.name, player.nickname;
