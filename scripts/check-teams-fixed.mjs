
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

function loadEnv() {
  const env = fs.readFileSync('./.env.local', 'utf8');
  env.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value.length > 0) {
      process.env[key.trim()] = value.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTeams() {
  console.log("Checking teams and matches...");
  const { data: teams, error } = await supabase
    .from('pro_teams')
    .select('id, name, tag, region');
  
  if (error) {
    console.error("Error fetching teams:", error);
    return;
  }

  console.log("Current Teams in DB:");
  console.table(teams.map(t => ({ id: t.id, name: t.name, tag: t.tag })));

  const { data: matches, error: mError } = await supabase
    .from('matches')
    .select('vlr_id, status')
    .order('match_date', { ascending: false })
    .limit(10);
  
  if (mError) {
    console.error("Error fetching matches:", mError);
    return;
  }

  console.log("\nRecent Matches in DB:");
  console.table(matches);
}

checkTeams();
