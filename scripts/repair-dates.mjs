
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Helper simple para leer .env.local sin dependencias extras
function loadEnv() {
  try {
    const env = fs.readFileSync('.env.local', 'utf8');
    env.split('\n').forEach(line => {
      const [key, ...value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.join('=').trim().replace(/^["']|["']$/g, '');
      }
    });
  } catch (e) {
    console.warn("No se pudo cargar .env.local, usando variables de entorno del sistema.");
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltan variables de entorno (NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixMatches() {
  console.log("Buscando partidos sin fecha en la DB...");
  const { data: matches, error: mError } = await supabase
    .from('matches')
    .select('*')
    .is('match_date', null);

  if (mError) {
    console.error("Error al buscar partidos:", mError);
    return;
  }

  if (!matches || matches.length === 0) {
    console.log("No hay partidos sin fecha.");
    return;
  }

  console.log(`Encontrados ${matches.length} partidos. Reparando directamente desde VLR...`);

  for (const match of matches) {
    if (!match.vlr_id) continue;
    
    console.log(`\n> Procesando partido vlr_id=${match.vlr_id}...`);
    try {
        const res = await fetch(`https://www.vlr.gg/${match.vlr_id}`);
        const html = await res.text();
        
        // VLR usa data-utc-ts con formato "YYYY-MM-DD HH:MM:SS"
        const dateMatch = html.match(/data-utc-ts="([^"]+)"/);
        
        if (dateMatch && dateMatch[1]) {
            // Convertir "2026-02-04 11:00:00" a ISO format
            const utcDateStr = dateMatch[1].trim();
            const date = new Date(utcDateStr + ' UTC'); // Forzar interpretación como UTC
            const isoDate = date.toISOString();
            
            console.log(`  [OK] Fecha detectada: ${utcDateStr} → ${isoDate}`);
            
            const { error: uError } = await supabase.from('matches')
                .update({ match_date: isoDate })
                .eq('id', match.id);
            
            if (uError) console.error(`  [!] Error al actualizar en DB:`, uError.message);
            else console.log(`  [OK] DB actualizada.`);
        } else {
            console.log(`  [?] No se encontró data-utc-ts en la página. Es posible que el ID ${match.vlr_id} sea incorrecto.`);
        }
    } catch (e) {
        console.error(`  [!] Error de red:`, e.message);
    }
  }
  console.log("\n--- Reparación completada ---");
}

fixMatches();
