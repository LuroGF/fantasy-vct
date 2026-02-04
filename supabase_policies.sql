
-- Habilitar RLS en las tablas principales
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gameweeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_performances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas para PERMITIR LECTURA PÚBLICA (SELECT) a datos generales
-- (Cualquier usuario autenticado o anónimo puede ver jugadores, equipos, partidos y jornadas)
CREATE POLICY "Public read players" ON public.pro_players FOR SELECT USING (true);
CREATE POLICY "Public read teams" ON public.pro_teams FOR SELECT USING (true);
CREATE POLICY "Public read matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Public read gameweeks" ON public.gameweeks FOR SELECT USING (true);
CREATE POLICY "Public read performances" ON public.player_performances FOR SELECT USING (true);

-- Perfiles: Cualquiera puede ver perfiles, pero solo el dueño puede editar
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Ligas: Cualquiera puede ver ligas públicas o en las que participa
CREATE POLICY "Users can view leagues" ON public.leagues FOR SELECT USING (true); 
-- (Nota: Puedes restringir esto más tarde si quieres privacidad extrema)

-- Participantes de ligas
CREATE POLICY "Public read league participants" ON public.league_participants FOR SELECT USING (true);

-- Roster: El usuario solo puede ver su propio roster y otros si la liga es pública (simplificado a lectura pública por ahora)
CREATE POLICY "Public read rosters" ON public.user_rosters FOR SELECT USING (true);
-- Pero solo puede editar el suyo
CREATE POLICY "Users can manage own roster" ON public.user_rosters 
  FOR ALL USING (auth.uid() = profile_id);

-- Transacciones: Solo el usuario ve sus transacciones
CREATE POLICY "Users can view own transactions" ON public.market_transactions FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can insert own transactions" ON public.market_transactions FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Asegurar que el SERVICE ROLE siempre tenga acceso total (por defecto en Supabase, pero bueno saberlo)
-- El cliente admin (supabaseAdmin) usa la service_role key y se salta estas políticas.
