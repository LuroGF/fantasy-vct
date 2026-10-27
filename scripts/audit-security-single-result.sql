-- Auditoría de solo lectura en un único resultado JSON.
-- Útil porque Supabase SQL Editor suele dejar visible únicamente el último
-- conjunto de resultados cuando se ejecutan varias consultas seguidas.

select jsonb_pretty(
  jsonb_build_object(
    'tables_without_rls', coalesce((
      select jsonb_agg(to_jsonb(a) order by a.table_name)
      from (
        select c.relname as table_name
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relkind in ('r', 'p')
          and not c.relrowsecurity
      ) a
    ), '[]'::jsonb),
    'policies_by_table', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.tablename, p.policyname)
      from (
        select tablename, policyname, permissive, roles, cmd, qual, with_check
        from pg_policies
        where schemaname = 'public'
      ) p
    ), '[]'::jsonb),
    'anon_authenticated_table_grants', coalesce((
      select jsonb_agg(to_jsonb(g) order by g.table_name, g.grantee)
      from (
        select
          grantee,
          table_name,
          string_agg(distinct privilege_type, ', ' order by privilege_type) as privileges
        from information_schema.role_table_grants
        where table_schema = 'public'
          and grantee in ('anon', 'authenticated')
        group by grantee, table_name
      ) g
    ), '[]'::jsonb),
    'anon_authenticated_column_grants', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.table_name, c.grantee, c.column_name)
      from (
        select
          grantee,
          table_name,
          column_name,
          string_agg(distinct privilege_type, ', ' order by privilege_type) as privileges
        from information_schema.column_privileges
        where table_schema = 'public'
          and grantee in ('anon', 'authenticated')
          and privilege_type <> 'SELECT'
        group by grantee, table_name, column_name
      ) c
    ), '[]'::jsonb),
    'public_views', coalesce((
      select jsonb_agg(to_jsonb(v) order by v.view_name)
      from (
        select
          c.relname as view_name,
          c.relkind as relation_kind,
          coalesce(array_to_string(c.reloptions, ', '), '') as view_options
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relkind in ('v', 'm')
      ) v
    ), '[]'::jsonb),
    'externally_executable_functions', coalesce((
      select jsonb_agg(to_jsonb(f) order by f.function_name, f.arguments)
      from (
        select
          p.proname as function_name,
          pg_get_function_identity_arguments(p.oid) as arguments,
          p.prosecdef as security_definer,
          coalesce(array_to_string(p.proacl, ', '), '') as acl,
          has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
          has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and (
            has_function_privilege('anon', p.oid, 'EXECUTE')
            or has_function_privilege('authenticated', p.oid, 'EXECUTE')
          )
      ) f
    ), '[]'::jsonb)
  )
) as security_audit;
