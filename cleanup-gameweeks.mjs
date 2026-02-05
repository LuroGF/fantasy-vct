
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

function loadEnv() {
  const env = fs.readFileSync('./.env.local', 'utf8');
  env.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

loadEnv();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanupDuplicates() {
  console.log("🧹 Iniciando limpieza de jornadas duplicadas...\n");

  const { data: gameweeks, error } = await supabase
    .from('gameweeks')
    .select('id, name, start_date')
    .order('start_date', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    console.error("Error al obtener jornadas:", error);
    return;
  }

  const seen = new Map();
  const duplicates = [];

  for (const gw of gameweeks) {
    if (seen.has(gw.start_date)) {
      duplicates.push({
        duplicate_id: gw.id,
        master_id: seen.get(gw.start_date),
        name: gw.name
      });
    } else {
      seen.set(gw.start_date, gw.id);
    }
  }

  if (duplicates.length === 0) {
    console.log("✅ No se encontraron jornadas duplicadas.");
    return;
  }

  console.log(`⚠️ Se encontraron ${duplicates.length} jornadas duplicadas.`);

  for (const dup of duplicates) {
    console.log(`\nProcesando duplicado: ${dup.name} (ID: ${dup.duplicate_id})`);
    
    // 1. Re-vincular partidos
    console.log(`  🔗 Re-vinculando partidos a la jornada maestra ID: ${dup.master_id}...`);
    const { error: updateError } = await supabase
      .from('matches')
      .update({ gameweek_id: dup.master_id })
      .eq('gameweek_id', dup.duplicate_id);

    if (updateError) {
      console.error(`  ❌ Error re-vinculando partidos:`, updateError);
      continue;
    }

    // 2. Borrar la jornada duplicada
    console.log(`  🗑️ Borrando jornada duplicada...`);
    const { error: deleteError } = await supabase
      .from('gameweeks')
      .delete()
      .eq('id', dup.duplicate_id);

    if (deleteError) {
      console.error(`  ❌ Error borrando jornada:`, deleteError);
    } else {
      console.log(`  ✅ Limpieza completada para esta jornada.`);
    }
  }

  console.log("\n✨ Proceso de limpieza finalizado.");
}

cleanupDuplicates();
