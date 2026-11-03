-- Borrado de cuenta autoservicio.
-- Transfiere el liderazgo, elimina ligas vacías y borra la identidad de Auth
-- dentro de una única transacción.

CREATE OR REPLACE FUNCTION public.delete_account_for_profile(
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid := p_user_id;
  v_league record;
  v_next_leader uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User id is required';
  END IF;

  -- Evita dos eliminaciones simultáneas de la misma cuenta.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'Account not found';
  END IF;

  FOR v_league IN
    SELECT league.id, league.name
    FROM public.leagues league
    WHERE league.creator_id = v_user_id
    ORDER BY league.created_at, league.id
    FOR UPDATE
  LOOP
    SELECT participant.profile_id
    INTO v_next_leader
    FROM public.league_participants participant
    WHERE participant.league_id = v_league.id
      AND participant.profile_id <> v_user_id
    ORDER BY participant.created_at, participant.profile_id
    LIMIT 1;

    IF v_next_leader IS NULL THEN
      DELETE FROM public.leagues WHERE id = v_league.id;
    ELSE
      UPDATE public.leagues
      SET creator_id = v_next_leader
      WHERE id = v_league.id;

      INSERT INTO public.notifications (
        profile_id, league_id, title, message, type, category, action_url, dedupe_key
      ) VALUES (
        v_next_leader,
        v_league.id,
        'Ahora lideras ' || v_league.name,
        'El anterior líder ha eliminado su cuenta. Ahora puedes gestionar participantes y reportes.',
        'league_leadership_transferred',
        'social',
        '/leagues',
        'account-deletion-leader:' || v_league.id::text || ':' || v_next_leader::text
      )
      ON CONFLICT (profile_id, dedupe_key) DO NOTHING;
    END IF;
  END LOOP;

  -- Retira la participación mediante la misma rutina que usa "abandonar liga",
  -- pero sin bloquear el ejercicio del derecho de supresión durante una jornada.
  FOR v_league IN
    SELECT participant.league_id AS id
    FROM public.league_participants participant
    WHERE participant.profile_id = v_user_id
    ORDER BY participant.league_id
  LOOP
    PERFORM public.remove_fantasy_league_member_data(v_league.id, v_user_id);
  END LOOP;

  -- Tablas históricas sin borrado en cascada en el esquema original.
  DELETE FROM public.participant_scores_history WHERE profile_id = v_user_id;
  DELETE FROM public.market_transactions WHERE profile_id = v_user_id;

  -- La amistad es una función heredada y su tabla puede no existir en todos
  -- los entornos. Si existe, elimina ambos extremos de la relación.
  IF to_regclass('public.friends') IS NOT NULL THEN
    EXECUTE
      'DELETE FROM public.friends WHERE user_id = $1 OR friend_id = $1'
      USING v_user_id;
  END IF;

  -- El resto de datos personales cuelga de profiles/auth.users con CASCADE.
  -- La eliminación de Auth borra también el perfil y la suscripción push.
  DELETE FROM auth.users WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account could not be deleted';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_account_for_profile(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_account_for_profile(uuid) TO service_role;

COMMENT ON FUNCTION public.delete_account_for_profile(uuid) IS
  'Service-role-only account deletion after application-level password reauthentication.';
