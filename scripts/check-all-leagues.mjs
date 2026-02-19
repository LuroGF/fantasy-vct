import { createClient } from "@supabase/supabase-js";
import path from "path";
import dotenv from "dotenv";

const envPath = path.resolve(process.cwd(), ".env.local");
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLeagues() {
    const { data: leagues, error } = await supabase.from('leagues').select('*');
    if (error) {
        console.error("Error fetching leagues:", error);
        return;
    }
    console.log("Leagues in DB:", leagues);
}

checkLeagues();
