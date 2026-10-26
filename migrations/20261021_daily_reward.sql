-- Daily reward: 500,000 euros per enabled league and calendar day.
-- The claim is account-wide, atomic and evaluated using Europe/Madrid time.

ALTER TABLE public.leagues
  ADD COLUMN IF NOT EXISTS daily_reward_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_bonus_claim_at timestamp with time zone;

CREATE TABLE IF NOT EXISTS public.daily_bonus_claims (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_date date NOT NULL,
  amount_per_league bigint NOT NULL CHECK (amount_per_league > 0),
  league_count integer NOT NULL DEFAULT 0 CHECK (league_count >= 0),
  total_awarded bigint NOT NULL DEFAULT 0 CHECK (total_awarded >= 0),
  claimed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT daily_bonus_claims_profile_date_unique UNIQUE (profile_id, reward_date)
);

CREATE TABLE IF NOT EXISTS public.daily_bonus_credits (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  claim_id uuid NOT NULL REFERENCES public.daily_bonus_claims(id) ON DELETE CASCADE,
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  amount bigint NOT NULL CHECK (amount > 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT daily_bonus_credits_claim_league_unique UNIQUE (claim_id, league_id)
);

CREATE INDEX IF NOT EXISTS daily_bonus_claims_profile_date_idx
  ON public.daily_bonus_claims (profile_id, reward_date DESC);

CREATE INDEX IF NOT EXISTS daily_bonus_credits_claim_idx
  ON public.daily_bonus_credits (claim_id);

ALTER TABLE public.daily_bonus_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_bonus_credits ENABLE ROW LEVEL SECURITY;

-- Preserve the most recent legacy claim so a deployment cannot grant a second
-- reward on the same calendar day. Older claims used the former 2M amount.
INSERT INTO public.daily_bonus_claims (
  profile_id,
  reward_date,
  amount_per_league,
  league_count,
  total_awarded,
  claimed_at
)
SELECT
  profile.id,
  (timezone('Europe/Madrid', profile.last_bonus_claim_at))::date,
  2000000,
  0,
  0,
  profile.last_bonus_claim_at
FROM public.profiles profile
WHERE profile.last_bonus_claim_at IS NOT NULL
ON CONFLICT (profile_id, reward_date) DO NOTHING;

DROP POLICY IF EXISTS "Users can view own daily bonus claims" ON public.daily_bonus_claims;
CREATE POLICY "Users can view own daily bonus claims"
  ON public.daily_bonus_claims
  FOR SELECT
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can view own daily bonus credits" ON public.daily_bonus_credits;
CREATE POLICY "Users can view own daily bonus credits"
  ON public.daily_bonus_credits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.daily_bonus_claims claim
      WHERE claim.id = daily_bonus_credits.claim_id
        AND claim.profile_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.get_daily_bonus_status()
RETURNS TABLE (
  can_claim boolean,
  reward_amount bigint,
  eligible_leagues integer,
  claimed_at timestamp with time zone,
  next_available_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
  v_reward_date date := (timezone('Europe/Madrid', now()))::date;
  v_claimed_at timestamp with time zone;
  v_eligible_leagues integer;
BEGIN
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT count(*)::integer
  INTO v_eligible_leagues
  FROM public.league_participants participant
  JOIN public.leagues league ON league.id = participant.league_id
  WHERE participant.profile_id = v_profile_id
    AND league.daily_reward_enabled = true;

  SELECT claim.claimed_at
  INTO v_claimed_at
  FROM public.daily_bonus_claims claim
  WHERE claim.profile_id = v_profile_id
    AND claim.reward_date = v_reward_date;

  RETURN QUERY SELECT
    v_claimed_at IS NULL AND v_eligible_leagues > 0,
    500000::bigint,
    v_eligible_leagues,
    v_claimed_at,
    ((v_reward_date + 1)::timestamp AT TIME ZONE 'Europe/Madrid');
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_daily_bonus()
RETURNS TABLE (
  claimed boolean,
  amount_per_league bigint,
  leagues_rewarded integer,
  total_awarded bigint,
  claimed_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
  v_reward_date date := (timezone('Europe/Madrid', now()))::date;
  v_claim_id uuid;
  v_claimed_at timestamp with time zone;
  v_league_count integer;
  v_total_awarded bigint;
BEGIN
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT count(*)::integer
  INTO v_league_count
  FROM public.league_participants participant
  JOIN public.leagues league ON league.id = participant.league_id
  WHERE participant.profile_id = v_profile_id
    AND league.daily_reward_enabled = true;

  IF v_league_count = 0 THEN
    RAISE EXCEPTION 'Necesitas participar en una liga para reclamar la recompensa';
  END IF;

  INSERT INTO public.daily_bonus_claims (
    profile_id,
    reward_date,
    amount_per_league
  )
  VALUES (
    v_profile_id,
    v_reward_date,
    500000
  )
  ON CONFLICT (profile_id, reward_date) DO NOTHING
  RETURNING id, daily_bonus_claims.claimed_at
  INTO v_claim_id, v_claimed_at;

  IF v_claim_id IS NULL THEN
    SELECT claim.claimed_at
    INTO v_claimed_at
    FROM public.daily_bonus_claims claim
    WHERE claim.profile_id = v_profile_id
      AND claim.reward_date = v_reward_date;

    RETURN QUERY SELECT false, 500000::bigint, 0, 0::bigint, v_claimed_at;
    RETURN;
  END IF;

  INSERT INTO public.daily_bonus_credits (claim_id, league_id, amount)
  SELECT v_claim_id, participant.league_id, 500000
  FROM public.league_participants participant
  JOIN public.leagues league ON league.id = participant.league_id
  WHERE participant.profile_id = v_profile_id
    AND league.daily_reward_enabled = true;

  UPDATE public.league_participants participant
  SET current_budget = COALESCE(participant.current_budget, 0) + credit.amount
  FROM public.daily_bonus_credits credit
  WHERE credit.claim_id = v_claim_id
    AND participant.league_id = credit.league_id
    AND participant.profile_id = v_profile_id;

  SELECT count(*)::integer, COALESCE(sum(credit.amount), 0)::bigint
  INTO v_league_count, v_total_awarded
  FROM public.daily_bonus_credits credit
  WHERE credit.claim_id = v_claim_id;

  UPDATE public.daily_bonus_claims
  SET league_count = v_league_count,
      total_awarded = v_total_awarded
  WHERE id = v_claim_id;

  -- Keep the former field current while older deployments are phased out.
  UPDATE public.profiles
  SET last_bonus_claim_at = v_claimed_at
  WHERE id = v_profile_id;

  RETURN QUERY SELECT true, 500000::bigint, v_league_count, v_total_awarded, v_claimed_at;
END;
$$;

REVOKE ALL ON FUNCTION public.get_daily_bonus_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_daily_bonus() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_daily_bonus_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_bonus() TO authenticated;

COMMENT ON COLUMN public.leagues.daily_reward_enabled IS
  'Controls whether this league receives the account daily reward.';
COMMENT ON TABLE public.daily_bonus_claims IS
  'One atomic daily reward claim per trainer and Europe/Madrid calendar day.';
COMMENT ON TABLE public.daily_bonus_credits IS
  'Per-league audit ledger for each daily reward claim.';
