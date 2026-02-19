
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

function loadEnv() {
  const envFile = fs.existsSync('.env.local') ? '.env.local' : '.env';
  const env = fs.readFileSync(envFile, 'utf8');
  env.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

loadEnv();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function manageGameweeks() {
  const action = process.argv[2]; // 'create', 'link', 'status'
  
  if (action === 'activate') {
    const id = process.argv[3];
    if (!id) {
        console.log("Uso: node manage-gw.mjs activate <id>");
        return;
    }
    // Deactivate all
    await supabase.from('gameweeks').update({ is_active: false }).eq('is_active', true);
    // Activate one
    const { data, error } = await supabase.from('gameweeks').update({ is_active: true, is_locked: false }).eq('id', id).select().single();
    if (error) console.error(error.message);
    else console.log(`✅ Jornada "${data.name}" activada.`);

  } else if (action === 'create') {
    const name = process.argv[3];
    const startStr = process.argv[4]; // YYYY-MM-DD
    const endStr = process.argv[5];   // YYYY-MM-DD
    
    if (!name || !startStr || !endStr) {
        console.log("Uso: node manage-gw.mjs create <nombre> <fecha_inicio> <fecha_fin>");
        console.log("Ejemplo: node manage-gw.mjs create 'Semana 1' 2026-02-10 2026-02-16");
        return;
    }

    const start = new Date(startStr);
    start.setHours(0,0,0,0);
    const end = new Date(endStr);
    end.setHours(23,59,59,999);

    const { data: gw, error } = await supabase
        .from('gameweeks')
        .insert({
            name,
            start_date: start.toISOString(),
            end_date: end.toISOString(),
            is_active: false,
            is_locked: false
        })
        .select()
        .single();
    
    if (error) {
        console.error("Error creando jornada:", error.message);
        return;
    }
    console.log(`✅ Jornada creada: ${gw.name} (ID: ${gw.id})`);
    
    // Auto-link matches
    const { count } = await supabase
        .from('matches')
        .update({ gameweek_id: gw.id })
        .gte('match_date', gw.start_date)
        .lte('match_date', gw.end_date)
        .is('gameweek_id', null);
    
    console.log(`🔗 ${count || 0} partidos vinculados automáticamente.`);

  } else if (action === 'status') {
      const { data: gws } = await supabase.from('gameweeks').select('*').order('start_date', { ascending: false });
      console.log("\n--- ESTADO DE JORNADAS ---");
      gws?.forEach(g => {
          console.log(`${g.is_active ? '🟢' : '⚪'} [ID: ${g.id}] ${g.name} | ${g.start_date.split('T')[0]} - ${g.end_date.split('T')[0]} | Locked: ${g.is_locked}`);
      });
  } else {
      console.log("Acciones disponibles: create, status");
  }
}

manageGameweeks();
