import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  console.log("Checking tables...");
  
  const tables = ['profiles', 'leagues', 'league_participants', 'user_rosters'];
  
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`Table ${table} error:`, error.message);
    } else {
      console.log(`Table ${table} exists and has ${count} rows.`);
    }
  }

  console.log("\nChecking last 5 leagues:");
  const { data: leagues } = await supabase.from('leagues').select('*').limit(5);
  console.log(leagues);

  console.log("\nChecking last 5 participants:");
  const { data: participants } = await supabase.from('league_participants').select('*').limit(5);
  console.log(participants);

  console.log("\nChecking profiles:");
  const { data: profiles } = await supabase.from('profiles').select('*').limit(5);
  console.log(profiles);
}

debug();
