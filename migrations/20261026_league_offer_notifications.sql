-- Notify the owner when the automated league market creates an offer for one
-- of their listed players. The notification is created by the database so it
-- does not depend on an open browser or on the Next.js process that invoked
-- the market engine.

CREATE OR REPLACE FUNCTION public.notify_new_league_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player_name text;
BEGIN
  IF NEW.status <> 'pending' THEN
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
    NEW.owner_profile_id,
    NEW.league_id,
    'Oferta de la liga por ' || COALESCE(v_player_name, 'tu jugador'),
    'La liga ofrece ' || trim(to_char(NEW.amount, 'FM999G999G999G990')) ||
      ' € por ' || COALESCE(v_player_name, 'tu jugador') || '.',
    'league_offer_received',
    'market',
    '/market?league=' || NEW.league_id::text || '&tab=offers',
    'league-offer:' || NEW.id::text
  )
  ON CONFLICT (profile_id, dedupe_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_new_league_offer
  ON public.league_offers;

CREATE TRIGGER notify_new_league_offer
AFTER INSERT
ON public.league_offers
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_league_offer();

REVOKE ALL ON FUNCTION public.notify_new_league_offer()
  FROM PUBLIC, anon, authenticated;

-- Recover pending offers created during the last seven days. The unique
-- dedupe key makes this safe to execute more than once.
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
  offer.owner_profile_id,
  offer.league_id,
  'Oferta de la liga por ' || player.nickname,
  'La liga ofrece ' || trim(to_char(offer.amount, 'FM999G999G999G990')) ||
    ' € por ' || player.nickname || '.',
  'league_offer_received',
  'market',
  '/market?league=' || offer.league_id::text || '&tab=offers',
  'league-offer:' || offer.id::text
FROM public.league_offers offer
JOIN public.pro_players player ON player.id = offer.player_id
WHERE offer.status = 'pending'
  AND offer.created_at >= now() - interval '7 days'
  AND (offer.expires_at IS NULL OR offer.expires_at > now())
ON CONFLICT (profile_id, dedupe_key) DO NOTHING;

SELECT
  notification.profile_id,
  notification.title,
  notification.created_at
FROM public.notifications notification
WHERE notification.type = 'league_offer_received'
  AND notification.created_at >= now() - interval '7 days'
ORDER BY notification.created_at DESC;
