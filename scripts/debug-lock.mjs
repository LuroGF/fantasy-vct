
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
  const now = new Date();
  const madridString = now.toLocaleString("en-US", { timeZone: "Europe/Madrid" });
  const madridTime = new Date(madridString);
  const madridHour = madridTime.getHours();
  const todayString = madridTime.toISOString().split('T')[0];

  console.log(`Current Time (UTC): ${now.toISOString()}`);
  console.log(`Madrid Time String: ${madridString}`);
  console.log(`Today String (from Madrid Time ISO): ${todayString}`);
  console.log(`Madrid Hour: ${madridHour}`);

  const { data: activeGw } = await supabase
    .from('gameweeks')
    .select('*')
    .eq('is_active', true)
    .single();

  if (!activeGw) {
    console.log("No active gameweek");
    return;
  }

  console.log(`Active GW: ${activeGw.name} (ID: ${activeGw.id}) - Locked: ${activeGw.is_locked}`);

  const { data: gwMatches } = await supabase
    .from('matches')
    .select('match_date, status, vlr_id')
    .eq('gameweek_id', activeGw.id);

  console.log(`Matches in GW (${gwMatches?.length || 0}):`);
  for (const m of gwMatches || []) {
      const mDate = new Date(m.match_date);
      const mMadrid = new Date(mDate.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
      const mTodayString = mMadrid.toISOString().split('T')[0];
      const isToday = mTodayString === todayString;
      console.log(`  - ${m.vlr_id}: ${m.match_date} (Madrid: ${mMadrid.toISOString()}) [${m.status}] - Today? ${isToday}`);
  }
}

checkLockStatus();
