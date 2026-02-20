-- Asegurar permisos de lectura pública para casters si RLS está activo
ALTER TABLE public.casters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read casters" ON public.casters;
CREATE POLICY "Public read casters" ON public.casters FOR SELECT USING (true);

-- También para active_casters para que los usuarios vean quién está contratado
ALTER TABLE public.active_casters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active casters" ON public.active_casters;
CREATE POLICY "Public read active casters" ON public.active_casters FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can hire casters" ON public.active_casters;
CREATE POLICY "Users can hire casters" ON public.active_casters FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Dar permisos a los roles anon y authenticated para leer la tabla
GRANT SELECT ON public.casters TO anon, authenticated;
GRANT SELECT ON public.active_casters TO anon, authenticated;
