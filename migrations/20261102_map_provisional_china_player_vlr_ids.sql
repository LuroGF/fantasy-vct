-- Map the 35 currently market-eligible provisional China players to their
-- canonical VLR identities. This migration only sets pro_players.vlr_id; it
-- deliberately does not treat the roster as final or change roster_status.
-- Rarga and NoMan currently appear inactive on VLR and remain unchanged in
-- Fantasy until Riot/the user confirms the final 2027 XLG roster.

BEGIN;

CREATE TEMP TABLE _china_vlr_player_mapping (
  player_id uuid PRIMARY KEY,
  expected_nickname text NOT NULL,
  expected_team_id uuid NOT NULL,
  vlr_id text NOT NULL UNIQUE
) ON COMMIT DROP;

INSERT INTO _china_vlr_player_mapping (
  player_id,
  expected_nickname,
  expected_team_id,
  vlr_id
)
VALUES
  -- All Gamers
  ('109e365d-0503-4f8e-8b88-0b614c3e740e', 'Shr1mp', '484663c6-c1b9-483c-bb38-a0450276938a', '25494'),
  ('0aa204f0-fc7d-4040-9d19-7d3b71b15bb5', 'K1ra', '484663c6-c1b9-483c-bb38-a0450276938a', '46748'),
  ('96e4b937-f7f5-4637-ab4a-b36e587ad35a', 'Bai', '484663c6-c1b9-483c-bb38-a0450276938a', '52101'),
  ('7eef2a5d-b344-4c1d-93b5-a354008ccfc9', 'f4ngeer', '484663c6-c1b9-483c-bb38-a0450276938a', '21216'),
  ('53a37635-6075-44ea-b16f-183be606241b', 'iamgrq', '484663c6-c1b9-483c-bb38-a0450276938a', '58959'),
  -- Bilibili Gaming
  ('2db268fb-f26c-47a3-8659-5631dffe15f7', 'whzy', 'd33e7f44-75e7-4cbb-9530-031fa2d850bd', '4885'),
  ('ecd61e26-716a-40bc-a5a4-1dc26231e84a', 'rushia', 'd33e7f44-75e7-4cbb-9530-031fa2d850bd', '48878'),
  ('b8932cc2-499e-4259-9294-b02729897f3f', 'nephh', 'd33e7f44-75e7-4cbb-9530-031fa2d850bd', '10698'),
  ('6403f603-df3b-45d2-ab37-c527366d87d9', 'Knight', 'd33e7f44-75e7-4cbb-9530-031fa2d850bd', '4774'),
  ('d93cddf5-6716-436e-a9bf-b04928007f57', 'FT', 'd33e7f44-75e7-4cbb-9530-031fa2d850bd', '64029'),
  -- EDward Gaming
  ('91b020d6-d4eb-4d71-961a-fd7a4a623939', 'nobody', 'da32b6cb-5dd4-477d-a815-2c71a24c96c9', '3017'),
  ('8ca1216e-15de-4744-aca8-8ac763581ae9', 'ZmjjKK', 'da32b6cb-5dd4-477d-a815-2c71a24c96c9', '3520'),
  ('b43a9576-85de-40a6-acd0-483d345652d4', 'CHICHOO', 'da32b6cb-5dd4-477d-a815-2c71a24c96c9', '15559'),
  ('583573e2-1190-445e-babf-d46c6c848c1c', 'Smoggy', 'da32b6cb-5dd4-477d-a815-2c71a24c96c9', '4742'),
  ('8ec7586c-dc90-438a-9415-059a6a539c9e', 'Jieni7', 'da32b6cb-5dd4-477d-a815-2c71a24c96c9', '51244'),
  -- JD Gaming
  ('13e6bd87-e134-49fc-8b9a-c411cefa1484', 'BerLIN', 'f21f7d4b-70dd-49fd-8d41-bcd48d96b8b3', '7857'),
  ('0ca54186-f46c-4eee-a20a-282c097c1454', 'jkuro', 'f21f7d4b-70dd-49fd-8d41-bcd48d96b8b3', '3519'),
  ('e38d078d-a95b-4695-aa14-d956c8c6d4bf', 'zhe', 'f21f7d4b-70dd-49fd-8d41-bcd48d96b8b3', '49476'),
  ('36889798-a315-4786-859f-a62e85603bf9', 'Yuicaw', 'f21f7d4b-70dd-49fd-8d41-bcd48d96b8b3', '11218'),
  ('095d1fa9-7e02-4ac0-a17e-25021fea072f', 'crownfisher', 'f21f7d4b-70dd-49fd-8d41-bcd48d96b8b3', '64969'),
  -- Trace Esports
  ('00332a2e-17cf-40ba-82e5-0ebbbce3d721', 'LuoK1ng', '84c3e569-5a21-4bd8-8b35-4dddde8cf0cd', '3045'),
  ('7cf60b56-fa56-475d-b2af-ea73a28e90d9', 'Kai', '84c3e569-5a21-4bd8-8b35-4dddde8cf0cd', '37494'),
  ('13cfac96-226a-48c8-bc43-dab1912153d7', 'FengF', '84c3e569-5a21-4bd8-8b35-4dddde8cf0cd', '4770'),
  ('42ea0d5c-694d-4061-a7e6-7f859fc45318', 'FKEY', '84c3e569-5a21-4bd8-8b35-4dddde8cf0cd', '51249'),
  ('724145df-0f7a-4c84-93a1-6a477daf075f', 'DeLb', '84c3e569-5a21-4bd8-8b35-4dddde8cf0cd', '10821'),
  -- TYLOO
  ('b2090d36-5226-44dc-a2ab-6130c6be1519', 'SiuFatBB', 'cb1087de-6ae6-401c-9550-1f5ee9466592', '7849'),
  ('e42addca-5ec7-48e1-9a56-23c47c991bf2', 'Splash', 'cb1087de-6ae6-401c-9550-1f5ee9466592', '36685'),
  ('fb817946-c82f-46a9-8599-a0037567b6aa', 'Scales', 'cb1087de-6ae6-401c-9550-1f5ee9466592', '39485'),
  ('27c48f33-1276-47ff-ab31-6f7a1ae1fb9d', 'Erv', 'cb1087de-6ae6-401c-9550-1f5ee9466592', '55085'),
  ('c4184ceb-5988-497b-a491-adf8a5f71f8a', 'slowly', 'cb1087de-6ae6-401c-9550-1f5ee9466592', '41739'),
  -- Xi Lai Gaming
  ('9447108c-1f8d-4fc1-8c0c-afa64247cfb1', 'WsLeo', 'b89ff9af-f477-4092-8012-bdb13a20d8e7', '24308'),
  ('bd4a2d8e-7c26-4f3b-95ad-85d88023e9ba', 'Lysoar', 'b89ff9af-f477-4092-8012-bdb13a20d8e7', '37489'),
  ('d9e4d91b-a8bb-4ec9-acd8-07c7a288ef56', 'happywei', 'b89ff9af-f477-4092-8012-bdb13a20d8e7', '37927'),
  ('45a50474-8354-4e4c-aae0-41c2e46bd46e', 'Rarga', 'b89ff9af-f477-4092-8012-bdb13a20d8e7', '22047'),
  ('5cd48f50-1ad1-414b-9dda-e22d357ab5db', 'NoMan', 'b89ff9af-f477-4092-8012-bdb13a20d8e7', '11527');

DO $validate_china_player_mapping$
DECLARE
  v_invalid_targets integer;
  v_invalid_season_rows integer;
  v_conflicting_ids integer;
BEGIN
  SELECT count(*)
    INTO v_invalid_targets
    FROM _china_vlr_player_mapping AS mapping
    LEFT JOIN public.pro_players AS player ON player.id = mapping.player_id
   WHERE player.id IS NULL
      OR player.nickname <> mapping.expected_nickname
      OR player.team_id IS DISTINCT FROM mapping.expected_team_id;

  IF v_invalid_targets <> 0 THEN
    RAISE EXCEPTION
      'China VLR mapping contains % missing, renamed or moved local targets',
      v_invalid_targets;
  END IF;

  SELECT count(*)
    INTO v_invalid_season_rows
    FROM _china_vlr_player_mapping AS mapping
    LEFT JOIN public.vct_season_players AS season_player
      ON season_player.season_year = 2027
     AND season_player.player_id = mapping.player_id
     AND season_player.team_id = mapping.expected_team_id
     AND season_player.roster_status = 'active'
     AND season_player.market_eligible = true
   WHERE season_player.player_id IS NULL;

  IF v_invalid_season_rows <> 0 THEN
    RAISE EXCEPTION
      '% mapped China players are not active and market eligible for their expected team',
      v_invalid_season_rows;
  END IF;

  SELECT count(*)
    INTO v_conflicting_ids
    FROM _china_vlr_player_mapping AS mapping
    JOIN public.pro_players AS player ON player.vlr_id = mapping.vlr_id
   WHERE player.id <> mapping.player_id;

  IF v_conflicting_ids <> 0 THEN
    RAISE EXCEPTION
      'China VLR mapping conflicts with % existing local players',
      v_conflicting_ids;
  END IF;
END;
$validate_china_player_mapping$;

UPDATE public.pro_players AS player
   SET vlr_id = mapping.vlr_id
  FROM _china_vlr_player_mapping AS mapping
 WHERE player.id = mapping.player_id
   AND player.vlr_id IS DISTINCT FROM mapping.vlr_id;

DO $verify_china_player_mapping$
DECLARE
  v_incorrect_mappings integer;
BEGIN
  SELECT count(*)
    INTO v_incorrect_mappings
    FROM _china_vlr_player_mapping AS mapping
    JOIN public.pro_players AS player ON player.id = mapping.player_id
   WHERE player.vlr_id IS DISTINCT FROM mapping.vlr_id;

  IF v_incorrect_mappings <> 0 THEN
    RAISE EXCEPTION
      'Failed to persist % China VLR player mappings',
      v_incorrect_mappings;
  END IF;
END;
$verify_china_player_mapping$;

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
  AND season_team.region = 'CHINA'
  AND season_player.roster_status = 'active'
  AND season_player.market_eligible = true
ORDER BY team.name, player.nickname;
