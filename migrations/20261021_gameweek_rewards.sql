-- Atomic, idempotent gameweek cash rewards for VCT Fantasy V1.
-- Points remain competitive only; they are never converted directly to money.

CREATE TABLE IF NOT EXISTS public.gameweek_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gameweek_id integer NOT NULL REFERENCES public.gameweeks(id) ON DELETE CASCADE,
  rank_position integer NOT NULL CHECK (rank_position > 0),
  tied_participants integer NOT NULL DEFAULT 1 CHECK (tied_participants > 0),
  lineup_size integer NOT NULL CHECK (lineup_size = 5),
  amount bigint NOT NULL CHECK (amount >= 0),
  paid_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (league_id, profile_id, gameweek_id)
);

CREATE INDEX IF NOT EXISTS gameweek_rewards_profile_idx
  ON public.gameweek_rewards (profile_id, paid_at DESC);

ALTER TABLE public.gameweek_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own gameweek rewards"
  ON public.gameweek_rewards;
CREATE POLICY "Users can view own gameweek rewards"
  ON public.gameweek_rewards FOR SELECT
  USING (auth.uid() = profile_id);

CREATE OR REPLACE FUNCTION public.gameweek_position_prize(p_position integer)
RETURNS bigint
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_position
    WHEN 1 THEN 2000000::bigint
    WHEN 2 THEN 1250000::bigint
    WHEN 3 THEN 750000::bigint
    ELSE 500000::bigint
  END;
$$;

CREATE OR REPLACE FUNCTION public.settle_gameweek_rewards(p_gameweek_id integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gameweek record;
  v_row record;
  v_reward_id uuid;
  v_amount bigint;
  v_paid integer := 0;
  v_total bigint := 0;
BEGIN
  SELECT id, name, end_date, is_final
    INTO v_gameweek
    FROM public.gameweeks
   WHERE id = p_gameweek_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Gameweek % does not exist', p_gameweek_id;
  END IF;

  IF NOT v_gameweek.is_final OR v_gameweek.end_date > now() THEN
    RAISE EXCEPTION 'Gameweek % is not final', p_gameweek_id;
  END IF;

  FOR v_row IN
    WITH eligible AS (
      SELECT
        scores.league_id,
        scores.profile_id,
        scores.points_earned,
        count(DISTINCT lineups.player_id)::integer AS lineup_size
      FROM public.participant_scores_history scores
      JOIN public.gameweek_lineups lineups
        ON lineups.gameweek_id = scores.gameweek_id
       AND lineups.league_id = scores.league_id
       AND lineups.profile_id = scores.profile_id
      WHERE scores.gameweek_id = p_gameweek_id
      GROUP BY
        scores.league_id,
        scores.profile_id,
        scores.points_earned
      HAVING count(DISTINCT lineups.player_id) = 5
    ),
    ranked AS (
      SELECT
        eligible.*,
        rank() OVER (
          PARTITION BY eligible.league_id
          ORDER BY eligible.points_earned DESC
        )::integer AS rank_position,
        count(*) OVER (
          PARTITION BY eligible.league_id, eligible.points_earned
        )::integer AS tied_participants
      FROM eligible
    )
    SELECT * FROM ranked
    ORDER BY league_id, rank_position, profile_id
  LOOP
    SELECT sum(public.gameweek_position_prize(position)) / v_row.tied_participants
      INTO v_amount
      FROM generate_series(
        v_row.rank_position,
        v_row.rank_position + v_row.tied_participants - 1
      ) AS position;

    v_reward_id := NULL;
    INSERT INTO public.gameweek_rewards (
      league_id,
      profile_id,
      gameweek_id,
      rank_position,
      tied_participants,
      lineup_size,
      amount
    ) VALUES (
      v_row.league_id,
      v_row.profile_id,
      p_gameweek_id,
      v_row.rank_position,
      v_row.tied_participants,
      v_row.lineup_size,
      v_amount
    )
    ON CONFLICT (league_id, profile_id, gameweek_id) DO NOTHING
    RETURNING id INTO v_reward_id;

    IF v_reward_id IS NULL THEN
      CONTINUE;
    END IF;

    UPDATE public.league_participants
       SET current_budget = current_budget + v_amount
     WHERE league_id = v_row.league_id
       AND profile_id = v_row.profile_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'League participant missing for reward %', v_reward_id;
    END IF;

    UPDATE public.participant_scores_history
       SET rewarded = true,
           rank_in_league = v_row.rank_position
     WHERE league_id = v_row.league_id
       AND profile_id = v_row.profile_id
       AND gameweek_id = p_gameweek_id;

    INSERT INTO public.notifications (
      profile_id,
      league_id,
      title,
      message,
      type,
      category,
      action_url,
      dedupe_key
    ) VALUES (
      v_row.profile_id,
      v_row.league_id,
      'Premio de jornada',
      CASE
        WHEN v_row.rank_position <= 3 THEN
          'Has terminado ' || v_row.rank_position || '.º en ' || v_gameweek.name ||
          ' y has recibido ' || trim(to_char(v_amount / 1000000.0, 'FM999990D00')) || ' M€.'
        ELSE
          'Has completado ' || v_gameweek.name ||
          ' y has recibido 500.000 € por participar.'
      END,
      'gameweek_reward',
      'gameweek',
      '/stats',
      'gameweek-reward:' || p_gameweek_id || ':' || v_row.league_id
    )
    ON CONFLICT (profile_id, dedupe_key) DO NOTHING;

    v_paid := v_paid + 1;
    v_total := v_total + v_amount;
  END LOOP;

  RETURN jsonb_build_object(
    'gameweek_id', p_gameweek_id,
    'paid', v_paid,
    'total', v_total
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.settle_finished_gameweek_rewards()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gameweek record;
  v_result jsonb;
  v_paid integer := 0;
  v_total bigint := 0;
BEGIN
  FOR v_gameweek IN
    SELECT id
      FROM public.gameweeks
     WHERE is_final = true
       AND end_date <= now()
     ORDER BY id
  LOOP
    v_result := public.settle_gameweek_rewards(v_gameweek.id);
    v_paid := v_paid + COALESCE((v_result->>'paid')::integer, 0);
    v_total := v_total + COALESCE((v_result->>'total')::bigint, 0);
  END LOOP;

  RETURN jsonb_build_object('paid', v_paid, 'total', v_total);
END;
$$;

REVOKE ALL ON FUNCTION public.gameweek_position_prize(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.settle_gameweek_rewards(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.settle_finished_gameweek_rewards() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.settle_gameweek_rewards(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_finished_gameweek_rewards() TO service_role;

COMMENT ON TABLE public.gameweek_rewards IS
  'Idempotent cash ledger for final gameweek placement and participation rewards.';

