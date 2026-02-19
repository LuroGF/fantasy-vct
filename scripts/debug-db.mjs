
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTeams() {
  const { data: teams, error } = await supabase
    .from('pro_teams')
    .select('id, name, tag, region');
  
  if (error) {
    console.error("Error fetching teams:", error);
    return;
  }

  console.log("Current Teams in DB:");
  console.table(teams);

  const { data: matches, error: mError } = await supabase
    .from('matches')
    .select('vlr_id, team_a, team_b, status');
  
  if (mError) {
    console.error("Error fetching matches:", mError);
    return;
  }

  console.log("\nMatches in DB:");
  console.table(matches);
}

checkTeams();
