import { createClient } from "@supabase/supabase-js";
import path from "path";
import dotenv from "dotenv";

const envPath = path.resolve(process.cwd(), ".env.local");
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('league_participants').select('*').limit(1);
    if (error) {
        console.error("Error:", error.message);
        return;
    }
    if (data && data[0]) {
        console.log("COLUMNS:", Object.keys(data[0]).join(", "));
    } else {
        console.log("No data in league_participants to check columns.");
    }
}
check();
