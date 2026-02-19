import { createClient } from "@supabase/supabase-js";
import path from "path";
import dotenv from "dotenv";

const envPath = path.resolve(process.cwd(), ".env.local");
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listColumns() {
    const tables = ['pro_players', 'pro_teams', 'leagues', 'user_rosters', 'matches'];
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (data && data[0]) {
            console.log(`Table: ${table}`);
            console.log(Object.keys(data[0]));
        } else {
            console.log(`Table: ${table} - No data or error: ${error?.message}`);
        }
    }
}

listColumns();
