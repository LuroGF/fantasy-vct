
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

async function inspectGW() {
  const { data: gws } = await supabase.from('gameweeks').select('*').eq('is_active', true);
  gws?.forEach(gw => {
      console.log(`GW: ${gw.name} | Start: ${gw.start_date} | End: ${gw.end_date} | Locked: ${gw.is_locked}`);
  });
}

inspectGW();
