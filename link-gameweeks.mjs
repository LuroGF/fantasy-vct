
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

async function linkMatchesToGameweeks() {
  console.log("Vinculando partidos a jornadas...\n");
  
  // Obtener todos los partidos con fecha
  const { data: matches } = await supabase
    .from('matches')
    .select('id, vlr_id, match_date')
    .not('match_date', 'is', null);
  
  if (!matches || matches.length === 0) {
    console.log("No hay partidos con fecha.");
    return;
  }
  
  console.log(`Encontrados ${matches.length} partidos con fecha.`);
  
  for (const match of matches) {
    const matchDate = new Date(match.match_date);
    
    // Calcular lunes y domingo de esa semana
    const day = matchDate.getDay();
    const diff = matchDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(matchDate);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    const startStr = monday.toISOString();
    
    // Buscar o crear gameweek
    // Usamos gte/lte para mayor precisión en la búsqueda por fecha si hay discrepancias de formato
    let { data: gw } = await supabase
      .from('gameweeks')
      .select('id, name')
      .eq('start_date', startStr)
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();
    
    if (!gw) {
      const weekLabel = monday.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
      const { data: created } = await supabase
        .from('gameweeks')
        .insert({
          name: `Jornada ${weekLabel}`,
          start_date: startStr,
          end_date: sunday.toISOString(),
          is_active: false,
          is_locked: false
        })
        .select('id, name')
        .single();
      
      gw = created;
      console.log(`  ✅ Creada jornada: ${gw.name}`);
    }
    
    // Vincular partido a jornada
    await supabase
      .from('matches')
      .update({ gameweek_id: gw.id })
      .eq('id', match.id);
    
    console.log(`  🔗 Partido ${match.vlr_id} → ${gw.name}`);
  }
  
  console.log("\n✅ Proceso completado.");
  
  // Mostrar resumen
  const { data: gameweeks } = await supabase
    .from('gameweeks')
    .select('id, name, start_date, is_active')
    .order('start_date', { ascending: true });
  
  console.log("\n📅 Jornadas en la base de datos:");
  for (const gw of gameweeks || []) {
    const { data: matchCount } = await supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .eq('gameweek_id', gw.id);
    
    const active = gw.is_active ? '🟢' : '⚪';
    console.log(`  ${active} ${gw.name} - ${matchCount?.length || 0} partidos`);
  }
}

linkMatchesToGameweeks();
