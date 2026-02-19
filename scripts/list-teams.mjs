
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://rynzshpalzyppspmwexb.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5bnpzaHBhbHp5cHBzcG13ZXhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDEzMjYxMSwiZXhwIjoyMDg1NzA4NjExfQ.5ZWOAnxZGthx3nQbfOBhkGy0OO54ZR-2ah-Z5AL6f5A";

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTeams() {
  const { data: teams } = await supabase.from('pro_teams').select('name, tag');
  console.log("TEAMS_START");
  teams.forEach(t => console.log(`${t.name}|${t.tag}`));
  console.log("TEAMS_END");

  const { data: matches } = await supabase.from('matches').select('vlr_id');
  console.log("MATCHES_START");
  matches.forEach(m => console.log(m.vlr_id));
  console.log("MATCHES_END");
}

listTeams();
