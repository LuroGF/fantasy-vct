import { supabaseAdmin } from "./lib/supabase.js";

async function checkMatches() {
  const { data: activeGw } = await supabaseAdmin
    .from('gameweeks')
    .select('*')
    .eq('is_active', true)
    .single();
  
  console.log("Active Gameweek:", activeGw);

  const { data: matches } = await supabaseAdmin
    .from('matches')
    .select('id, vlr_id, status, gameweek_id, team_a, team_b');
  
  console.log("Matches in DB:", matches?.length);
  matches?.forEach(m => {
    console.log(`Match ${m.vlr_id}: Status=${m.status}, GW_ID=${m.gameweek_id}`);
  });
}

checkMatches();
