import "server-only";

import { supabaseAdmin } from "@/utils/supabase/admin";

/**
 * Actualiza los valores de mercado de todos los jugadores basándose en su rendimiento reciente.
 * Esta función debería ejecutarse idealmente al final de cada jornada o diariamente.
 */
export async function updateMarketValues() {
  try {
    // 1. Ownership & Population Context
    const { data: ownerships } = await supabaseAdmin
      .from('user_rosters')
      .select('player_id')
      .returns<{ player_id: string }[]>();
    
    const ownerCounts = new Map<string, number>();
    ownerships?.forEach(o => ownerCounts.set(o.player_id, (ownerCounts.get(o.player_id) || 0) + 1));

    // 2. Fetch all players
    const { data: players, error: pError } = await supabaseAdmin
      .from('pro_players')
      .select('id, nickname, market_value, role');

    if (pError) throw pError;

    const { data: activeGw } = await supabaseAdmin.from('gameweeks').select('id').eq('is_active', true).maybeSingle();

    for (const player of players) {
      // 3. Performance Summary (Last 5 matches to catch the trend)
      const { data: perfs } = await supabaseAdmin
        .from('player_performances')
        .select('fantasy_points, created_at')
        .eq('player_id', player.id)
        .order('created_at', { ascending: false })
        .limit(5);

      let avgPoints = 0;
      let trendMultiplier = 1.0;
      const matchCount = perfs?.length || 0;

      if (perfs && perfs.length > 0) {
        const points = perfs.map(p => p.fantasy_points || 0);
        // Weighted average: more recent matches weigh more
        let weightedSum = 0;
        let weightTotal = 0;
        points.forEach((p, i) => {
          const weight = 1 / (i + 1);
          weightedSum += p * weight;
          weightTotal += weight;
        });
        avgPoints = weightedSum / weightTotal;
        
        // Trend: If the latest game is significantly better/worse than the average
        const latest = points[0];
        if (latest > (avgPoints * 1.3)) trendMultiplier = 1.15;
        else if (latest < (avgPoints * 0.7) && latest > 0) trendMultiplier = 0.85;
        else if (latest === 0 && points.length > 1) trendMultiplier = 0.90;

        // Protection for low match count (Rookies)
        if (matchCount < 3) {
           trendMultiplier = 1 + (trendMultiplier - 1) * 0.5; // Half the volatility
        }

      } else {
        // Inactive players: lose value faster (8% drop) until min
        const newValue = Math.max(1500000, Number(player.market_value) * 0.92);
        await supabaseAdmin.from('pro_players').update({ market_value: Math.round(newValue / 100000) * 100000 }).eq('id', player.id);
        continue;
      }

      // 4. THE VCT EMEA PREMIUM FORMULA
      // Base Value: 3M. Points contribution: 0.75 exponent allows scaling without hyper-inflation.
      const pointsContrib = 2000000 * Math.pow(avgPoints, 0.75);
      
      // Ownership contribution (Demand / Scarcity)
      const count = ownerCounts.get(player.id) || 0;
      const demandMultiplier = 1 + (count * 0.04); 

      let newValue = (3000000 + pointsContrib) * trendMultiplier * demandMultiplier;

      // Clamping: 1.5M to 120M
      newValue = Math.max(1500000, Math.min(120000000, newValue));
      
      // Precision: Round to nearest 100k
      newValue = Math.round(newValue / 100000) * 100000;

      // Only update if change is significant (> 100k) to avoid excessive noise
      if (Math.abs(newValue - Number(player.market_value)) >= 100000) {
        await supabaseAdmin.from('pro_players').update({ market_value: newValue }).eq('id', player.id);
        
        // Register value change in history (silent fail if table doesn't exist)
        try {
           await supabaseAdmin.from('player_value_history').insert({ 
               player_id: player.id, 
               old_value: player.market_value,
               new_value: newValue, 
               gameweek_id: activeGw?.id 
           });
        } catch (e) {
           // History table may not exist yet, ignoring
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating market values:", error);
    return { success: false, error };
  }
}
