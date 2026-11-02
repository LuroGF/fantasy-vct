-- Map the 30 currently market-eligible provisional Pacific players that still
-- lack a VLR identity. This only sets pro_players.vlr_id and does not confirm
-- rosters or change fantasy eligibility/status.

BEGIN;

CREATE TEMP TABLE _pacific_vlr_player_mapping (
  player_id uuid PRIMARY KEY,
  expected_nickname text NOT NULL,
  expected_team_id uuid NOT NULL,
  vlr_id text NOT NULL UNIQUE
) ON COMMIT DROP;

INSERT INTO _pacific_vlr_player_mapping (
  player_id,
  expected_nickname,
  expected_team_id,
  vlr_id
)
VALUES
  -- FULL SENSE
  ('f68d68e7-e71a-4157-b4f7-2025a0033401', 'Killua', '5d59025b-d24f-4cbd-94e6-83a3aced73ae', '13784'),
  ('a9aad7c7-fec4-4321-b4de-ef8175b5a16f', 'JitBoyS', '5d59025b-d24f-4cbd-94e6-83a3aced73ae', '13788'),
  ('094cfc78-2f6b-4f62-810b-24b177e126a0', 'seph1roth', '5d59025b-d24f-4cbd-94e6-83a3aced73ae', '27244'),
  ('a779bb74-5109-4513-9cf8-48a0042c7e86', 'Crws', '5d59025b-d24f-4cbd-94e6-83a3aced73ae', '3977'),
  ('1d0b1a70-520f-4b33-8643-226a507902d6', 'primmie', '5d59025b-d24f-4cbd-94e6-83a3aced73ae', '25255'),
  -- Gen.G
  ('0b6ce4f4-e074-455c-9199-335041a35d47', 'Ash', '209258af-f62c-4059-998b-bee46b66b17a', '25017'),
  ('013c6667-e4e1-4373-8cc7-795fadac5a07', 'Efina', '209258af-f62c-4059-998b-bee46b66b17a', '985'),
  ('bb586f1c-ca90-4cb9-a481-0628602202cb', 'Karon', '209258af-f62c-4059-998b-bee46b66b17a', '34974'),
  ('973d5cfd-ed51-47fc-a7b5-e188e0e5ea00', 'Raxcal', '209258af-f62c-4059-998b-bee46b66b17a', '48925'),
  ('5066819a-e561-4c84-bb67-86ae961bd789', 't3xture', '209258af-f62c-4059-998b-bee46b66b17a', '9196'),
  -- Paper Rex
  ('a9e0fa55-a021-44e0-a2af-d79340da1499', 'Jinggg', 'af4496f8-ac9c-4b13-bf4b-9b4ec823619f', '7378'),
  ('57be435e-8bf8-49e3-af03-04bbb733cc52', 'd4v41', 'af4496f8-ac9c-4b13-bf4b-9b4ec823619f', '9803'),
  ('a6bfea06-f6b8-4227-9513-de590ddf17ce', 'f0rsakeN', 'af4496f8-ac9c-4b13-bf4b-9b4ec823619f', '9801'),
  ('2b92067b-0f57-42df-8970-9871ea9be50e', 'invy', 'af4496f8-ac9c-4b13-bf4b-9b4ec823619f', '8504'),
  ('e9688ede-d75b-4fd7-938f-124d8d640fda', 'something', 'af4496f8-ac9c-4b13-bf4b-9b4ec823619f', '17086'),
  -- Rex Regum Qeon
  ('695d15d9-4600-402b-81c3-8619a567c6c3', 'Jemkin', 'fa251efe-7532-4564-a183-176e3a46d463', '24895'),
  ('182bed33-d5c3-4b3b-9cd4-2219c2e3246e', 'Monyet', 'fa251efe-7532-4564-a183-176e3a46d463', '8497'),
  ('adaa6c4a-2710-491c-91af-4a185edac49c', 'Xan', 'fa251efe-7532-4564-a183-176e3a46d463', '11737'),
  ('31816267-8f6f-4945-a914-dec00a0aa260', 'crazyguy', 'fa251efe-7532-4564-a183-176e3a46d463', '1430'),
  ('f178e9ce-fe19-4783-958e-4e943d6566f6', 'xffero', 'fa251efe-7532-4564-a183-176e3a46d463', '4871'),
  -- T1
  ('79de774c-f9c0-4bf6-9265-01990edf5833', 'BuZz', '7530fa5c-a2bb-404c-bcb4-e0e0dc2f9fb0', '804'),
  ('07553308-f626-445e-a7cd-b306fea53e8a', 'Meteor', '7530fa5c-a2bb-404c-bcb4-e0e0dc2f9fb0', '13039'),
  ('99e02871-c1dc-4b4a-904b-9ca919b30f94', 'Munchkin', '7530fa5c-a2bb-404c-bcb4-e0e0dc2f9fb0', '2489'),
  ('ea04b0e0-c295-446a-a720-c5fcaa4348db', 'iZu', '7530fa5c-a2bb-404c-bcb4-e0e0dc2f9fb0', '29833'),
  ('b5fbcb1a-9e64-45a1-85dc-0cff05151e3f', 'stax', '7530fa5c-a2bb-404c-bcb4-e0e0dc2f9fb0', '485'),
  -- ZETA DIVISION
  ('ff9a16b3-a813-40c2-86d7-6954f4376b24', 'Absol', '7d65838f-7591-4f0c-a711-eb23d7a0e8db', '34776'),
  ('2eda55cb-5417-4896-a096-59138efd832f', 'SugarZ3ro', '7d65838f-7591-4f0c-a711-eb23d7a0e8db', '6668'),
  ('75f470b7-4c77-4175-86a6-752991d556ab', 'SyouTa', '7d65838f-7591-4f0c-a711-eb23d7a0e8db', '12990'),
  ('5895ab3e-89f1-4612-8ae4-241a1782faea', 'Xdll', '7d65838f-7591-4f0c-a711-eb23d7a0e8db', '25221'),
  ('e183892d-7b94-4e96-b766-1cf7004a0f53', 'eKo', '7d65838f-7591-4f0c-a711-eb23d7a0e8db', '1960');

DO $validate_pacific_player_mapping$
DECLARE
  v_invalid_targets integer;
  v_invalid_season_rows integer;
  v_conflicting_ids integer;
BEGIN
  SELECT count(*)
    INTO v_invalid_targets
    FROM _pacific_vlr_player_mapping AS mapping
    LEFT JOIN public.pro_players AS player ON player.id = mapping.player_id
   WHERE player.id IS NULL
      OR player.nickname <> mapping.expected_nickname
      OR player.team_id IS DISTINCT FROM mapping.expected_team_id;

  IF v_invalid_targets <> 0 THEN
    RAISE EXCEPTION
      'Pacific VLR mapping contains % missing, renamed or moved local targets',
      v_invalid_targets;
  END IF;

  SELECT count(*)
    INTO v_invalid_season_rows
    FROM _pacific_vlr_player_mapping AS mapping
    LEFT JOIN public.vct_season_players AS season_player
      ON season_player.season_year = 2027
     AND season_player.player_id = mapping.player_id
     AND season_player.team_id = mapping.expected_team_id
     AND season_player.roster_status = 'active'
     AND season_player.market_eligible = true
   WHERE season_player.player_id IS NULL;

  IF v_invalid_season_rows <> 0 THEN
    RAISE EXCEPTION
      '% mapped Pacific players are not active and market eligible for their expected team',
      v_invalid_season_rows;
  END IF;

  SELECT count(*)
    INTO v_conflicting_ids
    FROM _pacific_vlr_player_mapping AS mapping
    JOIN public.pro_players AS player ON player.vlr_id = mapping.vlr_id
   WHERE player.id <> mapping.player_id;

  IF v_conflicting_ids <> 0 THEN
    RAISE EXCEPTION
      'Pacific VLR mapping conflicts with % existing local players',
      v_conflicting_ids;
  END IF;
END;
$validate_pacific_player_mapping$;

UPDATE public.pro_players AS player
   SET vlr_id = mapping.vlr_id
  FROM _pacific_vlr_player_mapping AS mapping
 WHERE player.id = mapping.player_id
   AND player.vlr_id IS DISTINCT FROM mapping.vlr_id;

DO $verify_pacific_player_mapping$
DECLARE
  v_incorrect_mappings integer;
BEGIN
  SELECT count(*)
    INTO v_incorrect_mappings
    FROM _pacific_vlr_player_mapping AS mapping
    JOIN public.pro_players AS player ON player.id = mapping.player_id
   WHERE player.vlr_id IS DISTINCT FROM mapping.vlr_id;

  IF v_incorrect_mappings <> 0 THEN
    RAISE EXCEPTION
      'Failed to persist % Pacific VLR player mappings',
      v_incorrect_mappings;
  END IF;
END;
$verify_pacific_player_mapping$;

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
  AND season_team.region = 'PACIFIC'
  AND season_player.roster_status = 'active'
  AND season_player.market_eligible = true
ORDER BY team.name, player.nickname;
