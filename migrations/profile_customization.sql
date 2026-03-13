-- Migration to add customization fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio text NULL,
ADD COLUMN IF NOT EXISTS banner_color text DEFAULT '#ff4655',
ADD COLUMN IF NOT EXISTS fav_team_id uuid REFERENCES public.pro_teams(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS title text DEFAULT 'Manager Novato';
