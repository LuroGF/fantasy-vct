
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

async function showStatus() {
  console.log("📊 ESTADO ACTUAL DEL SISTEMA\n");
  console.log("=".repeat(60));
  
  // Jornadas
  const { data: gameweeks } = await supabase
    .from('gameweeks')
    .select('*')
    .order('start_date', { ascending: true });
  
  console.log("\n📅 JORNADAS:");
  for (const gw of gameweeks || []) {
    const { count } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('gameweek_id', gw.id);
    
    const status = gw.is_active ? '🟢 ACTIVA' : gw.is_locked ? '🔒 BLOQUEADA' : '⚪ INACTIVA';
    const start = new Date(gw.start_date).toLocaleDateString('es-ES');
    const end = new Date(gw.end_date).toLocaleDateString('es-ES');
    
    console.log(`\n  ${status} ${gw.name}`);
    console.log(`    Periodo: ${start} - ${end}`);
    console.log(`    Partidos: ${count || 0}`);
  }
  
  // Partidos
  const { data: matches } = await supabase
    .from('matches')
    .select('vlr_id, match_date, status, gameweek_id')
    .order('match_date', { ascending: true });
  
  console.log("\n\n⚽ PARTIDOS:");
  for (const match of matches || []) {
    const date = match.match_date ? new Date(match.match_date).toLocaleString('es-ES') : 'SIN FECHA';
    const gw = gameweeks?.find(g => g.id === match.gameweek_id);
    const gwName = gw ? gw.name : 'Sin jornada';
    
    console.log(`  • ${match.vlr_id} - ${date} [${match.status}] → ${gwName}`);
  }
  
  console.log("\n" + "=".repeat(60));
  
  // Sugerencia
  const now = new Date();
  const currentWeekGw = gameweeks?.find(gw => {
    const start = new Date(gw.start_date);
    const end = new Date(gw.end_date);
    return now >= start && now <= end;
  });
  
  if (currentWeekGw && !currentWeekGw.is_active) {
    console.log(`\n💡 SUGERENCIA: Activar "${currentWeekGw.name}" (es la jornada actual)`);
    console.log(`   Ejecuta: node activate-gameweek.mjs ${currentWeekGw.id}`);
  } else if (!gameweeks?.some(gw => gw.is_active)) {
    const nextGw = gameweeks?.[0];
    if (nextGw) {
      console.log(`\n💡 SUGERENCIA: Activar "${nextGw.name}" (próxima jornada)`);
      console.log(`   Ejecuta: node activate-gameweek.mjs ${nextGw.id}`);
    }
  }
}

showStatus();
