-- Auditoría de solo lectura para ejecutar en Supabase > SQL Editor.
-- No modifica tablas, políticas, permisos ni funciones.

-- 1) Todas las tablas expuestas del esquema public y su estado RLS.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
order by c.relname;

-- 2) Tablas public sin RLS. El resultado esperado es cero filas.
select c.relname as table_without_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and not c.relrowsecurity
order by c.relname;

-- 3) Políticas RLS definidas por tabla.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 4) Privilegios efectivos de anon/authenticated sobre tablas y vistas.
select
  grantee,
  table_name,
  string_agg(distinct privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
group by grantee, table_name
order by table_name, grantee;

-- 5) Vistas public: conviene que las expuestas utilicen security_invoker.
select
  c.relname as view_name,
  coalesce(array_to_string(c.reloptions, ', '), '') as view_options
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('v', 'm')
order by c.relname;

-- 6) Funciones public que anon/authenticated pueden ejecutar.
-- Revisar especialmente las que modifican datos y confirmar que validan auth.uid().
select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (
    has_function_privilege('anon', p.oid, 'EXECUTE')
    or has_function_privilege('authenticated', p.oid, 'EXECUTE')
  )
order by p.proname, arguments;
