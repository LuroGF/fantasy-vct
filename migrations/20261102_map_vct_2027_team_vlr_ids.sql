-- Map the remaining confirmed VCT 2027 partner teams to their canonical VLR
-- profiles. IDs were verified directly against https://www.vlr.gg/team/<id>
-- on 2026-11-02. The migration is transactional and idempotent.

BEGIN;

CREATE TEMP TABLE _vct_2027_vlr_team_mapping (
  team_id uuid PRIMARY KEY,
  expected_name text NOT NULL,
  vlr_id text NOT NULL UNIQUE
) ON COMMIT DROP;

INSERT INTO _vct_2027_vlr_team_mapping (team_id, expected_name, vlr_id)
VALUES
  -- Americas
  ('70d535b4-7cfd-4526-8974-d108ca8566e7', 'KRÜ Visa', '2355'),
  ('54bf6e2b-a0a8-47b8-b93b-90a14eaef660', 'Leviatán Esports', '2359'),
  ('2bcbfae3-03cc-4ee4-89a0-d1e579517525', 'MIBR', '7386'),
  ('01bcad97-b544-433f-98f1-efc0e4718f12', 'Sentinels', '2'),
  -- China
  ('484663c6-c1b9-483c-bb38-a0450276938a', 'All Gamers', '1119'),
  ('d33e7f44-75e7-4cbb-9530-031fa2d850bd', 'Bilibili Gaming', '12010'),
  ('84c3e569-5a21-4bd8-8b35-4dddde8cf0cd', 'Trace Esports', '12685'),
  ('cb1087de-6ae6-401c-9550-1f5ee9466592', 'TYLOO Gaming', '731'),
  -- EMEA
  ('a7603da1-0364-4f60-befd-0ab1edd5e4cb', 'FNATIC', '2593'),
  ('2a995fe5-ca4f-48e4-9d08-a9fd5b5ecd47', 'Gentle Mates', '12694'),
  ('583929b8-34ef-427c-a2e7-2f95339da468', 'Team Heretics', '1001'),
  -- Pacific
  ('5d59025b-d24f-4cbd-94e6-83a3aced73ae', 'FULL SENSE', '4050'),
  ('1743ff9a-2082-4dc3-8379-6809d592f083', 'GAM Esports', '23700'),
  ('209258af-f62c-4059-998b-bee46b66b17a', 'Gen.G', '17'),
  ('fa251efe-7532-4564-a183-176e3a46d463', 'Rex Regum Qeon', '878'),
  ('7d65838f-7591-4f0c-a711-eb23d7a0e8db', 'ZETA DIVISION', '5448');

DO $validate_vlr_team_mapping$
DECLARE
  v_missing_targets integer;
  v_conflicting_ids integer;
BEGIN
  SELECT count(*)
    INTO v_missing_targets
    FROM _vct_2027_vlr_team_mapping AS mapping
    LEFT JOIN public.pro_teams AS team ON team.id = mapping.team_id
   WHERE team.id IS NULL
      OR team.name <> mapping.expected_name;

  IF v_missing_targets <> 0 THEN
    RAISE EXCEPTION
      'VLR team mapping contains % missing or renamed local targets',
      v_missing_targets;
  END IF;

  SELECT count(*)
    INTO v_conflicting_ids
    FROM _vct_2027_vlr_team_mapping AS mapping
    JOIN public.pro_teams AS team ON team.vlr_id = mapping.vlr_id
   WHERE team.id <> mapping.team_id;

  IF v_conflicting_ids <> 0 THEN
    RAISE EXCEPTION
      'VLR team mapping conflicts with % existing local teams',
      v_conflicting_ids;
  END IF;
END;
$validate_vlr_team_mapping$;

UPDATE public.pro_teams AS team
   SET vlr_id = mapping.vlr_id
  FROM _vct_2027_vlr_team_mapping AS mapping
 WHERE team.id = mapping.team_id
   AND team.vlr_id IS DISTINCT FROM mapping.vlr_id;

DO $verify_vlr_team_mapping$
DECLARE
  v_incorrect_mappings integer;
  v_confirmed_without_vlr_id integer;
BEGIN
  SELECT count(*)
    INTO v_incorrect_mappings
    FROM _vct_2027_vlr_team_mapping AS mapping
    JOIN public.pro_teams AS team ON team.id = mapping.team_id
   WHERE team.vlr_id IS DISTINCT FROM mapping.vlr_id;

  IF v_incorrect_mappings <> 0 THEN
    RAISE EXCEPTION
      'Failed to persist % VLR team mappings',
      v_incorrect_mappings;
  END IF;

  SELECT count(*)
    INTO v_confirmed_without_vlr_id
    FROM public.vct_season_teams AS season_team
    JOIN public.pro_teams AS team ON team.id = season_team.team_id
   WHERE season_team.season_year = 2027
     AND season_team.confirmation_status = 'confirmed'
     AND season_team.fantasy_eligible = true
     AND team.vlr_id IS NULL;

  IF v_confirmed_without_vlr_id <> 0 THEN
    RAISE EXCEPTION
      '% confirmed VCT 2027 teams still have no VLR id',
      v_confirmed_without_vlr_id;
  END IF;
END;
$verify_vlr_team_mapping$;

COMMIT;

SELECT
  season_team.region,
  team.name,
  team.tag,
  team.vlr_id
FROM public.vct_season_teams AS season_team
JOIN public.pro_teams AS team ON team.id = season_team.team_id
WHERE season_team.season_year = 2027
  AND season_team.confirmation_status = 'confirmed'
  AND season_team.fantasy_eligible = true
ORDER BY season_team.region, team.name;
