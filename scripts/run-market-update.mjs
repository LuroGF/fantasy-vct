
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

function loadEnv() {
  const envFile = fs.existsSync('.env.local') ? '.env.local' : '.env';
  if (!fs.existsSync(envFile)) return;
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

async function runUpdate() {
    console.log("🚀 Iniciando recalibración de precios de mercado...");
    
    try {
        // 1. Get Ownership counts
        const { data: ownerships } = await supabase
            .from('user_rosters')
            .select('player_id');
        
        const ownerCounts = new Map();
        ownerships?.forEach(o => ownerCounts.set(o.player_id, (ownerCounts.get(o.player_id) || 0) + 1));

        // 2. Fetch all players
        const { data: players } = await supabase
            .from('pro_players')
            .select('id, nickname, market_value');

        console.log(`Procesando ${players?.length} jugadores...`);

        for (const player of players || []) {
            // 3. Performance Summary (Last 5 matches)
            const { data: perfs } = await supabase
                .from('player_performances')
                .select('fantasy_points, created_at')
                .eq('player_id', player.id)
                .order('created_at', { ascending: false })
                .limit(5);

            let avgPoints = 0;
            let trendMultiplier = 1.0;

            if (perfs && perfs.length > 0) {
                const points = perfs.map(p => p.fantasy_points || 0);
                avgPoints = points.reduce((a, b) => a + b, 0) / points.length;
                if (points[0] > (avgPoints * 1.2)) trendMultiplier = 1.1;
                else if (points[0] < (avgPoints * 0.8)) trendMultiplier = 0.9;
            } else {
                const newValue = Math.max(2500000, Number(player.market_value) * 0.95);
                await supabase.from('pro_players').update({ market_value: Math.round(newValue / 250000) * 250000 }).eq('id', player.id);
                continue;
            }

            // 4. BALANCED FORMULA
            const pointsContrib = 1500000 * Math.pow(avgPoints, 0.7);
            const count = ownerCounts.get(player.id) || 0;
            const demandMultiplier = 1 + (count * 0.03); // 3% per owner

            let newValue = (4000000 + pointsContrib) * trendMultiplier * demandMultiplier;
            newValue = Math.max(2500000, Math.min(55000000, newValue));
            newValue = Math.round(newValue / 250000) * 250000;

            if (Math.abs(newValue - Number(player.market_value)) > 100000) {
                console.log(`- ${player.nickname}: $${(player.market_value/1000000).toFixed(1)}M -> $${(newValue/1000000).toFixed(1)}M (Owners: ${count})`);
                await supabase.from('pro_players').update({ market_value: newValue }).eq('id', player.id);
            }
        }
        console.log("✅ Recalibración completada.");
    } catch (e) {
        console.error("❌ Error:", e.message);
    }
}

runUpdate();
