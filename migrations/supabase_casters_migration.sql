-- Migración: Sistema de Casters (Mesa de Análisis)
CREATE TABLE IF NOT EXISTS public.casters (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    name text NOT NULL,
    nickname text NOT NULL UNIQUE,
    description text NOT NULL,
    buff_description text NOT NULL,
    buff_code text NOT NULL, -- Código interno para la lógica de puntos
    base_price bigint DEFAULT 2000000,
    photo_url text NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT casters_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.active_casters (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
    profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    gameweek_id integer NOT NULL REFERENCES public.gameweeks(id) ON DELETE CASCADE,
    caster_id uuid NOT NULL REFERENCES public.casters(id) ON DELETE CASCADE,
    activated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT active_casters_pkey PRIMARY KEY (id)
);

-- Note: Constraint 'one_caster_per_gameweek' removed to allow exactly 2 casters. 
-- Limit is now handled in the application layer logic.

-- RLS
ALTER TABLE public.casters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_casters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read casters" ON public.casters FOR SELECT USING (true);
CREATE POLICY "Public read active casters" ON public.active_casters FOR SELECT USING (true);
CREATE POLICY "Users can hire casters" ON public.active_casters FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- SEED DATA: Casters Españoles
INSERT INTO public.casters (nickname, name, description, buff_description, buff_code, base_price) VALUES
('Ulises', 'Ulises Prieto', 'El Rey del Hype de la LVP.', '+10 puntos extra por cada Clutch ganado por tus jugadores.', 'ULISES_HYPE', 2500000),
('Kaquka', 'Beatriz Alonso', 'Analista experta en táctica y posicionamiento.', '+20% de puntos para todos tus Iniciadores.', 'KAQUKA_TACTICS', 2000000),
('Uri', 'Uri', 'Especialista en control y setups defensivos.', '+20% de puntos para todos tus Centinelas.', 'URI_CONTROL', 2000000),
('Iker', 'No info', 'Narrador de las gestas más épicas del circuito.', '+20% de puntos para todos tus Duelistas.', 'IKER_HEROIC', 2200000),
('Luigi9', 'No info', 'El maestro de las estadísticas y el rendimiento.', '+20% de puntos para todos tus Controladores.', 'LUIGI_STATS', 2000000)
ON CONFLICT (nickname) DO UPDATE SET 
    description = EXCLUDED.description,
    buff_description = EXCLUDED.buff_description,
    buff_code = EXCLUDED.buff_code,
    base_price = EXCLUDED.base_price;
