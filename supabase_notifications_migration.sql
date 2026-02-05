-- Migración: Sistema de Notificaciones
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    profile_id uuid NOT NULL, -- Destinatario
    league_id uuid NULL,      -- Contexto de la liga
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL,       -- 'hostile_buy', 'card_activation', 'welcome', etc.
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT notifications_pkey PRIMARY KEY (id),
    CONSTRAINT notifications_profile_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT notifications_league_fkey FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE SET NULL
) TABLESPACE pg_default;

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" 
ON public.notifications FOR SELECT 
USING (auth.uid() = profile_id);

CREATE POLICY "Users can update own notifications" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = profile_id);

-- Trigger opcional para limpiar notificaciones antiguas (ej. más de 30 días)
-- Por ahora lo manejamos manualmente o lo dejamos así.
