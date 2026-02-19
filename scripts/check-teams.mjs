
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

function loadEnv() {
  const env = fs.readFileSync('.env.local', 'utf8');
  env.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

loadEnv();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data } = await supabase.from('pro_teams').select('name, tag');
  console.log("Teams in DB:", data?.length);
  console.log(data);
}
run();
