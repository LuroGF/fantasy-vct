
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

async function checkLockStatus() {
  const { data: activeGw } = await supabase.from('gameweeks').select('*').eq('is_active', true).single();
  console.log(`GW: ${activeGw?.name}, Locked: ${activeGw?.is_locked}`);
  
  const now = new Date();
  const today = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Madrid" })).toISOString().split('T')[0];
  console.log(`Today (Madrid): ${today}`);

  const { data: matches } = await supabase.from('matches').select('*').eq('gameweek_id', activeGw.id);
  const matchesToday = matches.filter(m => {
      const mDate = new Date(m.match_date);
      const mMadrid = new Date(mDate.toLocaleString("en-US", { timeZone: "Europe/Madrid" })).toISOString().split('T')[0];
      return mMadrid === today;
  });
  
  console.log(`Matches today: ${matchesToday.length}`);
  for (const m of matchesToday) {
      console.log(` - ${m.vlr_id}: ${m.match_date} [${m.status}]`);
  }
}

checkLockStatus();
