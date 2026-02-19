import { createClient } from "@supabase/supabase-js";
import path from "path";
import dotenv from "dotenv";

const envPath = path.resolve(process.cwd(), ".env.local");
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProLeagues() {
    const { data: proPlayers, error } = await supabase.from('pro_players').select('*').limit(1);
    if (proPlayers && proPlayers[0]) {
        console.log("Pro Player columns:", Object.keys(proPlayers[0]));
    }
    
    const { data: proTeams } = await supabase.from('pro_teams').select('*').limit(1);
    if (proTeams && proTeams[0]) {
        console.log("Pro Team columns:", Object.keys(proTeams[0]));
    }

    const { data: leagues } = await supabase.from('leagues').select('*').limit(1);
    if (leagues && leagues[0]) {
        console.log("League columns:", Object.keys(leagues[0]));
    }
}

checkProLeagues();
