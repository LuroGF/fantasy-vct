-- Prueba reversible del borrado de cuenta.
-- Crea dos usuarios aislados, comprueba transferencia y permisos, y hace ROLLBACK.

BEGIN;

CREATE TEMP TABLE account_deletion_test_result (
  result jsonb NOT NULL
) ON COMMIT DROP;

DO $$
DECLARE
  v_deleted_user uuid := gen_random_uuid();
  v_successor uuid := gen_random_uuid();
  v_league_id uuid := gen_random_uuid();
  v_suffix text := replace(gen_random_uuid()::text, '-', '');
  v_new_leader uuid;
BEGIN
  IF has_function_privilege('anon', 'public.delete_account_for_profile(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute delete_account_for_profile';
  END IF;

  IF has_function_privilege('authenticated', 'public.delete_account_for_profile(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated can execute delete_account_for_profile';
  END IF;

  IF NOT has_function_privilege('service_role', 'public.delete_account_for_profile(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role cannot execute delete_account_for_profile';
  END IF;

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    v_deleted_user,
    'authenticated',
    'authenticated',
    'delete-' || v_suffix || '@example.invalid',
    crypt('Temporary-password-1', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('username', 'delete_' || left(v_suffix, 10)),
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    v_successor,
    'authenticated',
    'authenticated',
    'successor-' || v_suffix || '@example.invalid',
    crypt('Temporary-password-1', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('username', 'successor_' || left(v_suffix, 10)),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_deleted_user)
     OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_successor) THEN
    RAISE EXCEPTION 'Profile trigger did not create both test profiles';
  END IF;

  INSERT INTO public.leagues (
    id, name, invite_code, creator_id, is_public, max_participants, budget_limit
  ) VALUES (
    v_league_id,
    'Account deletion transaction test',
    'DEL' || upper(left(v_suffix, 5)),
    v_deleted_user,
    false,
    10,
    50000000
  );

  INSERT INTO public.league_participants (
    league_id, profile_id, current_budget, total_points, created_at
  ) VALUES
    (v_league_id, v_deleted_user, 50000000, 0, now() - interval '1 minute'),
    (v_league_id, v_successor, 50000000, 0, now());

  PERFORM public.delete_account_for_profile(v_deleted_user);

  IF EXISTS (SELECT 1 FROM auth.users WHERE id = v_deleted_user) THEN
    RAISE EXCEPTION 'Auth user was not deleted';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_deleted_user) THEN
    RAISE EXCEPTION 'Profile was not deleted';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.league_participants
    WHERE league_id = v_league_id AND profile_id = v_deleted_user
  ) THEN
    RAISE EXCEPTION 'League participation was not deleted';
  END IF;

  SELECT creator_id INTO v_new_leader
  FROM public.leagues
  WHERE id = v_league_id;

  IF v_new_leader IS DISTINCT FROM v_successor THEN
    RAISE EXCEPTION 'League leadership was not transferred';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.notifications
    WHERE profile_id = v_successor
      AND league_id = v_league_id
      AND type = 'league_leadership_transferred'
  ) THEN
    RAISE EXCEPTION 'Leadership notification was not created';
  END IF;

  INSERT INTO account_deletion_test_result(result)
  VALUES (
    jsonb_build_object(
      'status', 'passed',
      'persistence', 'none: transaction rolled back',
      'anon_execute_denied', true,
      'authenticated_execute_denied', true,
      'service_role_execute_allowed', true,
      'auth_user_deleted', true,
      'profile_deleted', true,
      'participation_deleted', true,
      'leadership_transferred', true,
      'successor_notified', true
    )
  );
END;
$$;

SELECT result AS test_result FROM account_deletion_test_result;

ROLLBACK;
