import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTrades() {
    const { data: trades, error } = await supabase
        .from('trade_offers')
        .select(`
            *,
            sender:profiles!trade_offers_sender_id_fkey(username),
            receiver:profiles!trade_offers_receiver_id_fkey(username)
        `);
    
    if (error) {
        console.error("Error fetching trades:", error);
        return;
    }

    console.log("Total trades found:", trades?.length);
    console.log("Trades details:", JSON.stringify(trades, null, 2));
}

checkTrades();
