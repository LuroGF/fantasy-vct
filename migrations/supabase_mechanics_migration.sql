-- Migración: Mercado Hostil y Power-ups

-- 1. Modificar user_rosters para Cláusulas
ALTER TABLE public.user_rosters 
ADD COLUMN IF NOT EXISTS release_clause bigint NOT NULL DEFAULT 0;

-- 2. Tabla de Tipos de Power-ups
CREATE TABLE IF NOT EXISTS public.powerup_types (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    code text NOT NULL UNIQUE, -- 'LOCK', 'MONEY', 'CAPTAIN'
    name text NOT NULL,
    description text NOT NULL,
    base_price bigint NOT NULL DEFAULT 5000000, -- Precio en dinero virtual
    icon text NULL, -- Emoji o URL
    CONSTRAINT powerup_types_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- 3. Tabla de Inventario de Usuario
CREATE TABLE IF NOT EXISTS public.user_inventory (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    league_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    powerup_type_id uuid NOT NULL,
    quantity integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_inventory_pkey PRIMARY KEY (id),
    CONSTRAINT user_inventory_league_profile_unique UNIQUE (league_id, profile_id, powerup_type_id),
    CONSTRAINT user_inventory_league_fkey FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
    CONSTRAINT user_inventory_profile_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT user_inventory_type_fkey FOREIGN KEY (powerup_type_id) REFERENCES powerup_types(id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- 4. Tabla de Power-ups Activos (Historial de uso)
CREATE TABLE IF NOT EXISTS public.active_powerups (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    league_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    gameweek_id integer NOT NULL,
    powerup_type_id uuid NOT NULL,
    target_player_id uuid NULL, -- Para LOCK o CAPTAIN
    activated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT active_powerups_pkey PRIMARY KEY (id),
    -- Restricción: Un usuario solo puede usar UN power-up por jornada (opcional, se puede controlar en backend también, pero DB es más seguro)
    CONSTRAINT one_powerup_per_gameweek UNIQUE (league_id, profile_id, gameweek_id),
    CONSTRAINT active_powerups_gameweek_fkey FOREIGN KEY (gameweek_id) REFERENCES gameweeks(id) ON DELETE CASCADE,
    CONSTRAINT active_powerups_type_fkey FOREIGN KEY (powerup_type_id) REFERENCES powerup_types(id) ON DELETE CASCADE,
    CONSTRAINT active_powerups_target_fkey FOREIGN KEY (target_player_id) REFERENCES pro_players(id) ON DELETE SET NULL
) TABLESPACE pg_default;

-- 5. Seed de Power-ups Iniciales
INSERT INTO public.powerup_types (code, name, description, base_price, icon) VALUES
('LOCK', 'El Candado', 'Protege a un jugador de ser robado por cláusula durante esta jornada.', 60, '🛡️'),
('MONEY', 'Inversor', 'Recibe 5M de presupuesto extra inmediatamente.', 80, '💰'),
('CAPTAIN', 'Capitán', 'El jugador seleccionado puntuará DOBLE en esta jornada.', 100, '©️')
ON CONFLICT (code) DO UPDATE SET 
    base_price = EXCLUDED.base_price,
    description = EXCLUDED.description,
    name = EXCLUDED.name,
    icon = EXCLUDED.icon;

-- 6. Políticas RLS (Básico)
ALTER TABLE public.powerup_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read powerup types" ON public.powerup_types FOR SELECT USING (true);

ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own inventory" ON public.user_inventory FOR SELECT USING (auth.uid() = profile_id);
-- Insert/Update se hará vía funciones de servidor con supabaseAdmin por seguridad, o políticas más complejas.

ALTER TABLE public.active_powerups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active powerups" ON public.active_powerups FOR SELECT USING (true);
