"use server";

import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin";

/**
 * Actualiza los valores de mercado de todos los jugadores basándose en su rendimiento reciente.
 * Esta función debería ejecutarse idealmente al final de cada jornada o diariamente.
 */
export async function updateMarketValues() {
  try {
    // 1. Obtener todos los jugadores
    const { data: players, error: pError } = await supabaseAdmin
      .from('pro_players')
      .select('id, nickname, market_value');

    if (pError) throw pError;

    for (const player of players) {
      // 2. Obtener las últimas 3 actuaciones del jugador
      const { data: performances, error: perfError } = await supabaseAdmin
        .from('player_performances')
        .select('fantasy_points')
        .eq('player_id', player.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (perfError) {
        console.error(`Error fetching performances for ${player.nickname}:`, perfError);
        continue;
      }

      // 3. Calcular la media de puntos
      let avgPoints = 0;
      if (performances && performances.length > 0) {
        const totalPoints = performances.reduce((sum, p) => sum + (p.fantasy_points || 0), 0);
        avgPoints = totalPoints / performances.length;
      } else {
        // Si no tiene partidos, mantener o bajar ligeramente si es muy caro
        continue; 
      }

      // 4. Calcular nuevo valor
      // Fórmula: Base 5M + (Media Puntos * 1.5M)
      // Limitado entre 5M y 60M
      const baseValue = 5000000;
      const performanceMultiplier = 1500000;
      let newValue = baseValue + (avgPoints * performanceMultiplier);

      // Clamping
      newValue = Math.max(5000000, Math.min(60000000, newValue));
      
      // Redondear a cientos de miles para que quede "bonito"
      newValue = Math.round(newValue / 500000) * 500000;

      // 5. Actualizar en BD si el cambio es significativo (evitar updates innecesarios)
      if (Math.abs(newValue - Number(player.market_value)) > 100000) {
        const { error: uError } = await supabaseAdmin
          .from('pro_players')
          .update({ market_value: newValue })
          .eq('id', player.id);
        
        if (uError) {
          console.error(`Error updating value for ${player.nickname}:`, uError);
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating market values:", error);
    return { success: false, error };
  }
}
