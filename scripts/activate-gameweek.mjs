
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

async function activateGameweek(gwId) {
  if (!gwId) {
    console.log("❌ Debes proporcionar el ID de la jornada");
    console.log("Uso: node activate-gameweek.mjs <gameweek_id>");
    return;
  }
  
  console.log(`Activando jornada ${gwId}...\n`);
  
  // Desactivar todas las jornadas
  await supabase
    .from('gameweeks')
    .update({ is_active: false })
    .neq('is_active', false); // Dummy filter to affect all active ones
  
  // Activar la jornada especificada
  const { data, error } = await supabase
    .from('gameweeks')
    .update({ is_active: true, is_locked: false })
    .eq('id', gwId)
    .select()
    .single();
  
  if (error) {
    console.error("❌ Error:", error.message);
    return;
  }
  
  console.log(`✅ Jornada "${data.name}" activada correctamente`);
  console.log(`   Inicio: ${new Date(data.start_date).toLocaleString('es-ES')}`);
  console.log(`   Fin: ${new Date(data.end_date).toLocaleString('es-ES')}`);
  
  // Mostrar partidos de esta jornada
  const { data: matches } = await supabase
    .from('matches')
    .select('vlr_id, match_date, status')
    .eq('gameweek_id', gwId)
    .order('match_date', { ascending: true });
  
  console.log(`\n⚽ Partidos en esta jornada (${matches?.length || 0}):`);
  for (const match of matches || []) {
    const date = new Date(match.match_date).toLocaleString('es-ES');
    console.log(`  • ${match.vlr_id} - ${date} [${match.status}]`);
  }
}

const gwId = process.argv[2] ? parseInt(process.argv[2]) : null;
activateGameweek(gwId);
