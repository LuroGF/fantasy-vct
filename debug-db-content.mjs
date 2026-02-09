import { createClient } from "@supabase/supabase-js";
import path from "path";
import dotenv from "dotenv";

const envPath = path.resolve(process.cwd(), ".env.local");
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function dumpData() {
    const { data: participations } = await supabase.from('league_participants').select('*');
    console.log("Participations:", participations);
    
    const { data: leagues } = await supabase.from('leagues').select('*');
    console.log("Leagues:", leagues);
}

dumpData();
