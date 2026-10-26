-- Create the in-app notification in the same transaction that resolves an
-- auction. This works regardless of whether the resolution is started by a
-- Supabase schedule, the Next.js cron route or a manual administrative run.

CREATE OR REPLACE FUNCTION public.notify_resolved_market_auction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player_name text;
BEGIN
  IF NEW.status NOT IN ('resolved', 'sold', 'completed')
     OR NEW.winner_profile_id IS NULL
     OR NEW.winning_amount IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT player.nickname
  INTO v_player_name
  FROM public.pro_players player
  WHERE player.id = NEW.player_id;

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
  VALUES (
    NEW.winner_profile_id,
    NEW.league_id,
    'Has fichado a ' || COALESCE(v_player_name, 'un jugador'),
    'Has ganado la puja por ' || COALESCE(v_player_name, 'un jugador') ||
      ' por ' || trim(to_char(NEW.winning_amount, 'FM999G999G999G990')) || ' €.',
    'auction_won',
    'market',
    '/team?league=' || NEW.league_id::text,
    'auction-won:' || NEW.id::text
  )
  ON CONFLICT (profile_id, dedupe_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_resolved_market_auction
  ON public.market_auctions;

CREATE TRIGGER notify_resolved_market_auction
AFTER UPDATE OF status, winner_profile_id, winning_amount, resolved_at
ON public.market_auctions
FOR EACH ROW
EXECUTE FUNCTION public.notify_resolved_market_auction();

REVOKE ALL ON FUNCTION public.notify_resolved_market_auction()
  FROM PUBLIC, anon, authenticated;

-- Recover recent auction results that were resolved before the trigger was
-- installed. The existing unique key keeps this operation idempotent.
SELECT public.enqueue_market_result_notifications()
  AS recovered_notifications;

SELECT
  notification.profile_id,
  notification.title,
  notification.push_status,
  notification.created_at
FROM public.notifications notification
WHERE notification.type = 'auction_won'
  AND notification.created_at >= now() - interval '7 days'
ORDER BY notification.created_at DESC;
