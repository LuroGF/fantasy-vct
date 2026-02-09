import { createClient } from "@supabase/supabase-js";
import path from "path";
import dotenv from "dotenv";

const envPath = path.resolve(process.cwd(), ".env.local");
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProLeagues() {
    const { data, error } = await supabase.from('pro_leagues').select('*').limit(1);
    if (!error) {
        console.log("Table pro_leagues EXISTS");
        console.log("Columns:", Object.keys(data[0] || {}));
    } else {
        console.log("Table pro_leagues NOT found:", error.message);
    }
}

checkProLeagues();
