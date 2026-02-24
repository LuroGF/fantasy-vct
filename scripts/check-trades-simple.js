const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTrades() {
    try {
        const { data: trades, error } = await supabase
            .from('trade_offers')
            .select('*');
        
        if (error) {
            console.error("Error fetching trades:", error);
            return;
        }

        console.log("Total trades found:", trades?.length);
        console.log("Trades IDs:", trades?.map(t => t.id));
    } catch (e) {
        console.error("Execution error:", e);
    }
}

checkTrades();
