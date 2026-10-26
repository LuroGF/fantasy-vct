-- VCT Fantasy 2027 V1 scoring.
-- This formula is global: player role does not modify points.
-- Existing player_performances are intentionally not recalculated by this migration.

CREATE OR REPLACE FUNCTION public.calculate_fantasy_points()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_points integer := 0;
  v_acs_bonus integer := 0;
BEGIN
  IF NEW.acs >= 300 THEN
    v_acs_bonus := 5;
  ELSIF NEW.acs >= 250 THEN
    v_acs_bonus := 3;
  ELSIF NEW.acs >= 200 THEN
    v_acs_bonus := 1;
  ELSIF NEW.acs >= 150 THEN
    v_acs_bonus := 0;
  ELSIF NEW.acs IS NOT NULL THEN
    v_acs_bonus := -1;
  END IF;

  v_points :=
    COALESCE(NEW.kills, 0) * 2
    - COALESCE(NEW.deaths, 0)
    + COALESCE(NEW.assists, 0)
    + COALESCE(NEW.clutches, 0) * 3
    + COALESCE(NEW.fb, 0) * 2
    - COALESCE(NEW.fd, 0)
    + v_acs_bonus
    + CASE WHEN COALESCE(NEW.mvp, false) THEN 5 ELSE 0 END;

  NEW.fantasy_points := v_points;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_calculate_points ON public.player_performances;
CREATE TRIGGER tr_calculate_points
BEFORE INSERT OR UPDATE ON public.player_performances
FOR EACH ROW
EXECUTE FUNCTION public.calculate_fantasy_points();

COMMENT ON FUNCTION public.calculate_fantasy_points() IS
  'VCT Fantasy 2027 V1 global scoring: K/D/A, clutch, FB/FD, ACS tiers and MVP.';

