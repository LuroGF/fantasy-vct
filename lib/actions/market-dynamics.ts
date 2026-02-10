"use server";

import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin";

/**
 * Actualiza los valores de mercado de todos los jugadores basándose en su rendimiento reciente.
 * Esta función debería ejecutarse idealmente al final de cada jornada o diariamente.
 */
export async function updateMarketValues() {
  try {
    // 1. Ownership & Population Context
    const { data: totalParticipants } = await supabaseAdmin.from('league_participants').select('id', { count: 'exact', head: true });
    const totalUserCount = totalParticipants ? 1 : 1; // Fallback

    const { data: ownerships } = await supabaseAdmin
      .from('user_rosters')
      .select('player_id')
      .returns<{ player_id: string }[]>();
    
    const ownerCounts = new Map<string, number>();
    ownerships?.forEach(o => ownerCounts.set(o.player_id, (ownerCounts.get(o.player_id) || 0) + 1));

    // 2. Fetch all players
    const { data: players, error: pError } = await supabaseAdmin
      .from('pro_players')
      .select('id, nickname, market_value');

    if (pError) throw pError;

    for (const player of players) {
      // 3. Performance Summary (Last 5 matches)
      const { data: perfs } = await supabaseAdmin
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
        
        // Trend: If the latest game is better than the average, price goes up faster
        if (points[0] > (avgPoints * 1.2)) trendMultiplier = 1.1;
        else if (points[0] < (avgPoints * 0.8)) trendMultiplier = 0.9;
      } else {
        // Inactive players lose value slowly
        const newValue = Math.max(8000000, Number(player.market_value) * 0.95);
        await supabaseAdmin.from('pro_players').update({ market_value: Math.round(newValue / 250000) * 250000 }).eq('id', player.id);
        continue;
      }

      // 4. THE FORMULA
      // Base: 10M
      // Points Value: Non-linear (Diminishing returns)
      // Points contribution = 1.5M * (points ^ 0.85) -> prevents 60M cap from being reached by a single 30pt game
      const pointsContrib = 1500000 * Math.pow(avgPoints, 0.85);
      
      // Ownership contribution (Demand)
      const count = ownerCounts.get(player.id) || 0;
      const demandMultiplier = 1 + (count * 0.02); // Every owner in the world adds 2% value

      let newValue = (10000000 + pointsContrib) * trendMultiplier * demandMultiplier;

      // Clamping: 8M to 80M
      newValue = Math.max(8000000, Math.min(80000000, newValue));
      
      // Formatting: Round to nearest 250k
      newValue = Math.round(newValue / 250000) * 250000;

      if (Math.abs(newValue - Number(player.market_value)) > 100000) {
        await supabaseAdmin.from('pro_players').update({ market_value: newValue }).eq('id', player.id);
      }
    }


    return { success: true };
  } catch (error) {
    console.error("Error updating market values:", error);
    return { success: false, error };
  }
}
