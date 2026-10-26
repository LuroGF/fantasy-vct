-- Pausa de funciones heredadas fuera del alcance de la V1.
-- Los datos se conservan para poder reactivarlas en una versión futura.

-- Algunas instalaciones nunca llegaron a crear este RPC o conservan otra
-- firma. Revocamos todas las variantes existentes sin hacer fallar la
-- migración cuando no exista ninguna.
DO $pause_rpc$
DECLARE
  function_signature regprocedure;
BEGIN
  FOR function_signature IN
    SELECT procedure.oid::regprocedure
    FROM pg_proc AS procedure
    INNER JOIN pg_namespace AS namespace
      ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname = 'handle_buy_powerup'
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      function_signature
    );
  END LOOP;
END;
$pause_rpc$;

-- Hacemos lo mismo con las tablas opcionales: las instalaciones que no las
-- tengan se consideran ya pausadas y no deben bloquear la migración.
DO $pause_tables$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'user_inventory',
    'active_powerups',
    'active_casters'
  ]
  LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format(
        'REVOKE INSERT, UPDATE, DELETE ON TABLE public.%I FROM anon, authenticated',
        table_name
      );
    END IF;
  END LOOP;
END;
$pause_tables$;
