
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function check() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    
    // Check user_rosters structure
    const { data: roster } = await supabase.from('user_rosters').select('*').limit(1);
    console.log("USER ROSTER COLUMNS:", roster ? Object.keys(roster[0] || {}) : "Empty");

    // Check if player_id is unique per profile in user_rosters or if duplicates are allowed
    const { data: dupCheck } = await supabase.from('user_rosters').select('player_id, profile_id').limit(10);
    console.log("SAMPLE ROSTER DATA:", dupCheck);
}

check();
