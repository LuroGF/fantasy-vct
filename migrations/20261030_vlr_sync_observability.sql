-- Historial operativo de las sincronizaciones VLR.
-- Solo Service Role puede leer o escribir esta tabla.

BEGIN;

CREATE TABLE IF NOT EXISTS public.vct_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type text NOT NULL CHECK (sync_type IN ('matches', 'stats')),
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'warning', 'failed')),
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT vct_sync_runs_finished_check CHECK (
    (status = 'running' AND finished_at IS NULL)
    OR (status <> 'running' AND finished_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS vct_sync_runs_type_started_idx
  ON public.vct_sync_runs (sync_type, started_at DESC);

CREATE INDEX IF NOT EXISTS vct_sync_runs_started_idx
  ON public.vct_sync_runs (started_at DESC);

ALTER TABLE public.vct_sync_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.vct_sync_runs FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.vct_sync_runs TO service_role;

COMMIT;

SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'vct_sync_runs';
