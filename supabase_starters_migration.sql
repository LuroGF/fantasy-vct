
-- Add is_starter column to user_rosters
ALTER TABLE user_rosters ADD COLUMN is_starter boolean NOT NULL DEFAULT false;

-- Create constraint: A user cannot have more than 5 starters per league
CREATE OR REPLACE FUNCTION check_starter_limit()
RETURNS TRIGGER AS $$
DECLARE
    starter_count INTEGER;
BEGIN
    IF NEW.is_starter = true THEN
        SELECT COUNT(*) INTO starter_count
        FROM user_rosters
        WHERE league_id = NEW.league_id 
          AND profile_id = NEW.profile_id 
          AND is_starter = true 
          AND id != NEW.id; -- Exclude self if updating
        
        IF starter_count >= 5 THEN
            RAISE EXCEPTION 'Maximum limit of 5 starters reached for this team.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_check_starter_limit
BEFORE INSERT OR UPDATE ON user_rosters
FOR EACH ROW
EXECUTE FUNCTION check_starter_limit();
