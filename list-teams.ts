import { createClient } from './utils/supabase/server';

async function listTeams() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('pro_teams').select('id, name, tag');
  if (error) {
    console.error("Error fetching teams:", error);
    return;
  }
  console.log("Teams in DB:");
  data.forEach(t => {
    console.log(`- ID: ${t.id} | Name: ${t.name} | Tag: ${t.tag}`);
  });
}

listTeams();
