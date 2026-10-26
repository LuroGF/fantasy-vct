-- Gestión de ligas V1: liderazgo, abandono, expulsión y reportes.
-- El líder es leagues.creator_id. No modifica ligas ni miembros al instalarse.

CREATE TABLE IF NOT EXISTS public.league_reports (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('inactivity', 'unsportsmanlike')),
  details text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dismissed', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT league_reports_not_self CHECK (reporter_id <> target_profile_id),
  CONSTRAINT league_reports_details_length CHECK (char_length(COALESCE(details, '')) <= 500)
);

CREATE UNIQUE INDEX IF NOT EXISTS league_reports_one_pending_per_reporter_idx
  ON public.league_reports (league_id, reporter_id, target_profile_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS league_reports_leader_queue_idx
  ON public.league_reports (league_id, status, created_at DESC);

ALTER TABLE public.league_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reporters and league leaders can view reports" ON public.league_reports;
CREATE POLICY "Reporters and league leaders can view reports"
  ON public.league_reports
  FOR SELECT
  USING (
    reporter_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.leagues league
      WHERE league.id = league_reports.league_id
        AND league.creator_id = auth.uid()
    )
  );

REVOKE ALL ON TABLE public.league_reports FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.league_reports TO authenticated;

CREATE OR REPLACE FUNCTION public.assert_league_membership_change_allowed(
  p_league_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.gameweeks gameweek
    WHERE gameweek.is_active = true
      AND now() >= gameweek.start_date
      AND now() <= gameweek.end_date
  ) THEN
    RAISE EXCEPTION 'League membership cannot change during an active gameweek';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_fantasy_league_member_data(
  p_league_id uuid,
  p_profile_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.manager_offers
  WHERE league_id = p_league_id
    AND (from_profile_id = p_profile_id OR to_profile_id = p_profile_id);

  DELETE FROM public.player_listings
  WHERE league_id = p_league_id
    AND owner_profile_id = p_profile_id;

  DELETE FROM public.league_offers
  WHERE league_id = p_league_id
    AND owner_profile_id = p_profile_id;

  DELETE FROM public.user_bids
  WHERE league_id = p_league_id
    AND profile_id = p_profile_id;

  DELETE FROM public.gameweek_rewards
  WHERE league_id = p_league_id
    AND profile_id = p_profile_id;

  DELETE FROM public.participant_scores_history
  WHERE league_id = p_league_id
    AND profile_id = p_profile_id;

  DELETE FROM public.gameweek_lineups
  WHERE league_id = p_league_id
    AND profile_id = p_profile_id;

  DELETE FROM public.user_rosters
  WHERE league_id = p_league_id
    AND profile_id = p_profile_id;

  UPDATE public.league_reports
  SET status = 'resolved',
      resolved_at = now(),
      resolved_by = auth.uid()
  WHERE league_id = p_league_id
    AND status = 'pending'
    AND (reporter_id = p_profile_id OR target_profile_id = p_profile_id);

  DELETE FROM public.league_participants
  WHERE league_id = p_league_id
    AND profile_id = p_profile_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_fantasy_league(
  p_league_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_creator_id uuid;
  v_next_leader uuid;
  v_member_count integer;
  v_league_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT creator_id, name
  INTO v_creator_id, v_league_name
  FROM public.leagues
  WHERE id = p_league_id
  FOR UPDATE;

  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'League not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.league_participants
    WHERE league_id = p_league_id AND profile_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'You do not belong to this league';
  END IF;

  PERFORM public.assert_league_membership_change_allowed(p_league_id);

  SELECT count(*) INTO v_member_count
  FROM public.league_participants
  WHERE league_id = p_league_id;

  IF v_creator_id = v_user_id AND v_member_count = 1 THEN
    DELETE FROM public.leagues WHERE id = p_league_id;
    RETURN jsonb_build_object('success', true, 'league_deleted', true);
  END IF;

  IF v_creator_id = v_user_id THEN
    SELECT profile_id
    INTO v_next_leader
    FROM public.league_participants
    WHERE league_id = p_league_id
      AND profile_id <> v_user_id
    ORDER BY created_at ASC, profile_id ASC
    LIMIT 1;

    UPDATE public.leagues
    SET creator_id = v_next_leader
    WHERE id = p_league_id;

    INSERT INTO public.notifications (
      profile_id, league_id, title, message, type, category, action_url, dedupe_key
    ) VALUES (
      v_next_leader,
      p_league_id,
      'Ahora lideras ' || v_league_name,
      'El anterior líder ha abandonado la liga. Ahora puedes gestionar participantes y reportes.',
      'league_leadership_transferred',
      'social',
      '/leagues',
      'league-leader:' || p_league_id::text || ':' || v_next_leader::text
    )
    ON CONFLICT (profile_id, dedupe_key) DO NOTHING;
  END IF;

  PERFORM public.remove_fantasy_league_member_data(p_league_id, v_user_id);

  RETURN jsonb_build_object(
    'success', true,
    'league_deleted', false,
    'new_leader_id', v_next_leader
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.kick_fantasy_league_member(
  p_league_id uuid,
  p_profile_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_leader_id uuid := auth.uid();
  v_league_name text;
BEGIN
  IF v_leader_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT name INTO v_league_name
  FROM public.leagues
  WHERE id = p_league_id
    AND creator_id = v_leader_id
  FOR UPDATE;

  IF v_league_name IS NULL THEN
    RAISE EXCEPTION 'Only the league leader can remove participants';
  END IF;

  IF p_profile_id = v_leader_id THEN
    RAISE EXCEPTION 'The league leader cannot remove themselves';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.league_participants
    WHERE league_id = p_league_id AND profile_id = p_profile_id
  ) THEN
    RAISE EXCEPTION 'Participant not found';
  END IF;

  PERFORM public.assert_league_membership_change_allowed(p_league_id);
  PERFORM public.remove_fantasy_league_member_data(p_league_id, p_profile_id);

  INSERT INTO public.notifications (
    profile_id, league_id, title, message, type, category, action_url, dedupe_key
  ) VALUES (
    p_profile_id,
    p_league_id,
    'Has sido expulsado de ' || v_league_name,
    'El líder de la liga ha retirado tu participación.',
    'league_member_removed',
    'social',
    '/leagues',
    'league-kick:' || p_league_id::text || ':' || p_profile_id::text || ':' || extract(epoch from clock_timestamp())::bigint::text
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.report_fantasy_league_member(
  p_league_id uuid,
  p_profile_id uuid,
  p_reason text,
  p_details text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reporter_id uuid := auth.uid();
  v_leader_id uuid;
  v_report_id uuid;
  v_reporter_name text;
  v_target_name text;
BEGIN
  IF v_reporter_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_profile_id = v_reporter_id THEN
    RAISE EXCEPTION 'You cannot report yourself';
  END IF;

  IF p_reason NOT IN ('inactivity', 'unsportsmanlike') THEN
    RAISE EXCEPTION 'Invalid report reason';
  END IF;

  IF char_length(COALESCE(trim(p_details), '')) > 500 THEN
    RAISE EXCEPTION 'Report details are too long';
  END IF;

  SELECT creator_id INTO v_leader_id
  FROM public.leagues
  WHERE id = p_league_id;

  IF v_leader_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.league_participants
    WHERE league_id = p_league_id AND profile_id = v_reporter_id
  ) OR NOT EXISTS (
    SELECT 1 FROM public.league_participants
    WHERE league_id = p_league_id AND profile_id = p_profile_id
  ) THEN
    RAISE EXCEPTION 'Both users must belong to the league';
  END IF;

  INSERT INTO public.league_reports (
    league_id, reporter_id, target_profile_id, reason, details
  ) VALUES (
    p_league_id, v_reporter_id, p_profile_id, p_reason, NULLIF(trim(p_details), '')
  )
  RETURNING id INTO v_report_id;

  SELECT username INTO v_reporter_name FROM public.profiles WHERE id = v_reporter_id;
  SELECT username INTO v_target_name FROM public.profiles WHERE id = p_profile_id;

  INSERT INTO public.notifications (
    profile_id, league_id, title, message, type, category, action_url, dedupe_key
  ) VALUES (
    v_leader_id,
    p_league_id,
    'Nuevo reporte en tu liga',
    COALESCE(v_reporter_name, 'Un entrenador') || ' ha reportado a ' || COALESCE(v_target_name, 'otro entrenador') || '.',
    'league_member_reported',
    'social',
    '/leagues',
    'league-report:' || v_report_id::text
  )
  ON CONFLICT (profile_id, dedupe_key) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'report_id', v_report_id);
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'You already have a pending report for this participant';
END;
$$;

CREATE OR REPLACE FUNCTION public.dismiss_fantasy_league_report(
  p_report_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_leader_id uuid := auth.uid();
BEGIN
  IF v_leader_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.league_reports report
  SET status = 'dismissed',
      resolved_at = now(),
      resolved_by = v_leader_id
  WHERE report.id = p_report_id
    AND report.status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.leagues league
      WHERE league.id = report.league_id
        AND league.creator_id = v_leader_id
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending report not found or access denied';
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.assert_league_membership_change_allowed(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.remove_fantasy_league_member_data(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.leave_fantasy_league(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.kick_fantasy_league_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.report_fantasy_league_member(uuid, uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dismiss_fantasy_league_report(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.leave_fantasy_league(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kick_fantasy_league_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_fantasy_league_member(uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_fantasy_league_report(uuid) TO authenticated;

COMMENT ON TABLE public.league_reports IS
  'Reportes de inactividad o conducta antideportiva revisados por el creador/líder de la liga.';
