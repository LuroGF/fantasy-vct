-- Use the same strict VCT 2027 eligibility predicate for initial rosters and
-- for the daily market. This prevents a new league member from receiving a
-- legacy player whose current team is not an eligible 2027 partner.

CREATE OR REPLACE FUNCTION public.repair_vct_2027_initial_roster(
  p_league_id uuid,
  p_profile_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player_id uuid;
  v_player_value bigint;
  v_roster_count integer;
  v_removed integer := 0;
  v_added integer := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.league_participants participant
    WHERE participant.league_id = p_league_id
      AND participant.profile_id = p_profile_id
  ) THEN
    RAISE EXCEPTION 'League participant not found';
  END IF;

  WITH removed AS (
    DELETE FROM public.user_rosters roster
    WHERE roster.league_id = p_league_id
      AND roster.profile_id = p_profile_id
      AND roster.is_active = true
      AND NOT public.is_vct_2027_market_eligible(roster.player_id)
    RETURNING roster.id
  )
  SELECT count(*) INTO v_removed FROM removed;

  -- Keep at most two active players per role. Flex remains unrestricted.
  WITH ranked AS (
    SELECT
      roster.id,
      player.role,
      row_number() OVER (
        PARTITION BY player.role
        ORDER BY roster.created_at, roster.id
      ) AS role_position
    FROM public.user_rosters roster
    JOIN public.pro_players player ON player.id = roster.player_id
    WHERE roster.league_id = p_league_id
      AND roster.profile_id = p_profile_id
      AND roster.is_active = true
  ), removed AS (
    DELETE FROM public.user_rosters roster
    USING ranked
    WHERE roster.id = ranked.id
      AND ranked.role <> 'Flex'
      AND ranked.role_position > 2
    RETURNING roster.id
  )
  SELECT v_removed + count(*) INTO v_removed FROM removed;

  SELECT count(*)
  INTO v_roster_count
  FROM public.user_rosters roster
  WHERE roster.league_id = p_league_id
    AND roster.profile_id = p_profile_id
    AND roster.is_active = true;

  WHILE v_roster_count < 5 LOOP
    SELECT player.id, COALESCE(player.market_value, 10000000)::bigint
    INTO v_player_id, v_player_value
    FROM public.pro_players player
    WHERE public.is_vct_2027_market_eligible(player.id)
      AND NOT EXISTS (
        SELECT 1
        FROM public.user_rosters owned
        WHERE owned.league_id = p_league_id
          AND owned.player_id = player.id
          AND owned.is_active = true
      )
      AND (
        player.role = 'Flex'
        OR (
          SELECT count(*)
          FROM public.user_rosters own_role
          JOIN public.pro_players own_player
            ON own_player.id = own_role.player_id
          WHERE own_role.league_id = p_league_id
            AND own_role.profile_id = p_profile_id
            AND own_role.is_active = true
            AND own_player.role = player.role
        ) < 2
      )
    ORDER BY
      (
        SELECT count(*)
        FROM public.user_rosters own_role
        JOIN public.pro_players own_player
          ON own_player.id = own_role.player_id
        WHERE own_role.league_id = p_league_id
          AND own_role.profile_id = p_profile_id
          AND own_role.is_active = true
          AND own_player.role = player.role
      ),
      random()
    LIMIT 1;

    IF v_player_id IS NULL THEN
      RAISE EXCEPTION 'Not enough eligible VCT 2027 players';
    END IF;

    INSERT INTO public.user_rosters (
      league_id,
      profile_id,
      player_id,
      acquisition_price,
      release_clause,
      is_active,
      is_starter,
      slot_type,
      acquired_at,
      clause_protected_until
    )
    VALUES (
      p_league_id,
      p_profile_id,
      v_player_id,
      0,
      v_player_value,
      true,
      true,
      'starter',
      now(),
      now() + interval '48 hours'
    );

    v_added := v_added + 1;
    v_roster_count := v_roster_count + 1;
    v_player_id := NULL;
  END LOOP;

  RETURN jsonb_build_object(
    'removed', v_removed,
    'added', v_added,
    'active_players', v_roster_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.repair_vct_2027_initial_roster(uuid, uuid)
  FROM PUBLIC, anon, authenticated;

-- Read-only verification of the current league state. No existing roster is
-- modified merely by installing this migration.
SELECT
  roster.league_id,
  count(*) FILTER (WHERE roster.is_active)::integer AS active_players,
  count(*) FILTER (
    WHERE roster.is_active
      AND NOT public.is_vct_2027_market_eligible(roster.player_id)
  )::integer AS ineligible_active_players
FROM public.user_rosters roster
GROUP BY roster.league_id
ORDER BY roster.league_id;
