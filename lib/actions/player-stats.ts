"use server";

import { createClient } from "@/utils/supabase/server";

export async function getPlayerStats(playerId: string) {
  const supabase = await createClient();

  try {
    // 1. Get player info with team
    const { data: player, error: pError } = await supabase
      .from("pro_players")
      .select(`
        *,
        pro_teams (
          id,
          name,
          tag,
          logo_url
        )
      `)
      .eq("id", playerId)
      .single();

    if (pError) throw pError;

    // 2. Get performance history with match details
    const { data: performances, error: perfError } = await supabase
      .from("player_performances")
      .select(`
        *,
        matches (
          id,
          start_date,
          team1_id,
          team2_id,
          team1_score,
          team2_score,
          pro_teams_team1:team1_id (name, tag, logo_url),
          pro_teams_team2:team2_id (name, tag, logo_url)
        )
      `)
      .eq("player_id", playerId)
      .order("created_at", { ascending: false });

    if (perfError) throw perfError;

    // 3. Calculate Aggregated Stats
    const totalMatches = performances.length;
    const stats = {
      avg_points: 0,
      avg_kd: 0,
      avg_acs: 0,
      total_mvps: 0,
      last_5_points: [] as number[],
    };

    if (totalMatches > 0) {
      const totalPoints = performances.reduce((sum, p) => sum + (p.fantasy_points || 0), 0);
      const totalKills = performances.reduce((sum, p) => sum + (p.kills || 0), 0);
      const totalDeaths = performances.reduce((sum, p) => sum + (p.deaths || 0), 1); // Avoid division by zero
      const totalAcs = performances.reduce((sum, p) => sum + (p.acs || 0), 0);
      
      stats.avg_points = Number((totalPoints / totalMatches).toFixed(1));
      stats.avg_kd = Number((totalKills / (totalDeaths || 1)).toFixed(2));
      stats.avg_acs = Math.round(totalAcs / totalMatches);
      stats.total_mvps = performances.filter(p => p.mvp).length;
      
      // Points trend (reversed for graph: oldest to newest)
      stats.last_5_points = performances
        .slice(0, 5)
        .reverse()
        .map(p => p.fantasy_points || 0);
    }

    return { 
      success: true, 
      data: {
        player,
        performances,
        stats
      }
    };
  } catch (error) {
    console.error("Error fetching player stats:", error);
    return { success: false, error: "Error al cargar estadísticas del jugador" };
  }
}
