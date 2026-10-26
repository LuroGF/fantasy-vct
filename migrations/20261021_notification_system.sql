-- Notification V1: actionable in-app alerts, push preferences and deduplication.

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  league_id uuid REFERENCES public.leagues(id) ON DELETE SET NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can manage their own subscriptions"
  ON public.push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS action_url text,
  ADD COLUMN IF NOT EXISTS dedupe_key text,
  ADD COLUMN IF NOT EXISTS read_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS push_processed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS push_status text;

-- Existing alerts predate the push outbox and must not be delivered retroactively.
UPDATE public.notifications
SET push_processed_at = COALESCE(push_processed_at, created_at),
    push_status = COALESCE(push_status, 'legacy')
WHERE push_processed_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notifications_profile_dedupe_unique'
      AND conrelid = 'public.notifications'::regclass
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_profile_dedupe_unique
      UNIQUE (profile_id, dedupe_key);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS notifications_profile_unread_idx
  ON public.notifications (profile_id, created_at DESC)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS notifications_push_pending_idx
  ON public.notifications (created_at)
  WHERE push_processed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  push_enabled boolean NOT NULL DEFAULT false,
  market_enabled boolean NOT NULL DEFAULT true,
  gameweek_enabled boolean NOT NULL DEFAULT true,
  social_enabled boolean NOT NULL DEFAULT true,
  daily_reward_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can view own notification preferences"
  ON public.notification_preferences
  FOR SELECT
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can insert own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can insert own notification preferences"
  ON public.notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can update own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can update own notification preferences"
  ON public.notification_preferences
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS user_agent text;

CREATE OR REPLACE FUNCTION public.enqueue_gameweek_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_inserted integer;
BEGIN
  INSERT INTO public.notifications (
    profile_id,
    league_id,
    title,
    message,
    type,
    category,
    action_url,
    dedupe_key
  )
  SELECT
    participant.profile_id,
    participant.league_id,
    'La jornada comienza pronto',
    'Quedan menos de 24 horas para el inicio de ' || gameweek.name || '. Revisa tu quinteto titular.',
    'gameweek_reminder',
    'gameweek',
    '/team?league=' || participant.league_id::text,
    'gameweek-24h:' || gameweek.id::text || ':' || participant.league_id::text
  FROM public.gameweeks gameweek
  CROSS JOIN public.league_participants participant
  WHERE gameweek.start_date > now()
    AND gameweek.start_date <= now() + interval '24 hours'
    AND COALESCE(gameweek.is_locked, false) = false
  ON CONFLICT (profile_id, dedupe_key) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_market_result_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_inserted integer;
BEGIN
  INSERT INTO public.notifications (
    profile_id,
    league_id,
    title,
    message,
    type,
    category,
    action_url,
    dedupe_key
  )
  SELECT
    auction.winner_profile_id,
    auction.league_id,
    'Has fichado a ' || player.nickname,
    'Has ganado la puja por ' || player.nickname || ' por ' ||
      trim(to_char(auction.winning_amount, 'FM999G999G999G990')) || ' €.',
    'auction_won',
    'market',
    '/team?league=' || auction.league_id::text,
    'auction-won:' || auction.id::text
  FROM public.market_auctions auction
  JOIN public.pro_players player ON player.id = auction.player_id
  WHERE auction.status IN ('resolved', 'sold', 'completed')
    AND auction.winner_profile_id IS NOT NULL
    AND auction.resolved_at >= now() - interval '7 days'
  ON CONFLICT (profile_id, dedupe_key) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_daily_reward_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_inserted integer;
  v_reward_date date := (timezone('Europe/Madrid', now()))::date;
BEGIN
  INSERT INTO public.notifications (
    profile_id,
    title,
    message,
    type,
    category,
    action_url,
    dedupe_key
  )
  SELECT DISTINCT
    participant.profile_id,
    'Tu recompensa diaria está disponible',
    'Todavía puedes reclamar 500.000 € para fichar en cada una de tus ligas.',
    'daily_reward_reminder',
    'daily_reward',
    '/dashboard',
    'daily-reward:' || v_reward_date::text
  FROM public.league_participants participant
  JOIN public.leagues league ON league.id = participant.league_id
  WHERE league.daily_reward_enabled = true
    AND NOT EXISTS (
      SELECT 1
      FROM public.daily_bonus_claims claim
      WHERE claim.profile_id = participant.profile_id
        AND claim.reward_date = v_reward_date
    )
  ON CONFLICT (profile_id, dedupe_key) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_gameweek_reminders() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enqueue_market_result_notifications() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enqueue_daily_reward_reminders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_gameweek_reminders() TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_market_result_notifications() TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_daily_reward_reminders() TO service_role;

COMMENT ON TABLE public.notification_preferences IS
  'Per-user push categories. In-app transactional notifications are always retained.';
COMMENT ON COLUMN public.notifications.dedupe_key IS
  'Stable event key used with profile_id to prevent duplicate alerts.';
