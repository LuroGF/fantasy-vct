import { createClient } from "@supabase/supabase-js";
import path from "path";
import dotenv from "dotenv";

const envPath = path.resolve(process.cwd(), ".env.local");
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllTables() {
    // Try to get all tables from the public schema using a query if rpc fails
    // Since we are using service role key, we can try to query information_schema.tables
    // But Supabase client doesn't support arbitrary SQL easily without RPC.
    
    // Let's try to query some common names to see if they exist
    const commonNames = ['leagues', 'player_leagues', 'pro_players_leagues', 'league_players'];
    for (const name of commonNames) {
        const { data, error } = await supabase.from(name).select('*').limit(1);
        if (!error) {
            console.log(`Table exists: ${name}`);
            if (data && data[0]) console.log("Columns:", Object.keys(data[0]));
        } else {
            console.log(`Table ${name} error: ${error.message}`);
        }
    }
}

listAllTables();
