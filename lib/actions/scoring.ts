"use server";

import { supabaseAdmin } from "@/utils/supabase/admin";
import { Database } from "@/types/supabase";

type ParticipantScoreInsert = Database["public"]["Tables"]["participant_scores_history"]["Insert"];

/**
 * Calculates scores for all participants in a given gameweek.
 * Aggregates points from user rosters based on player performances in matches within the gameweek.
 */
export async function calculateGameweekScores(gameweekId: number, finalize: boolean = false) {
  try {
    // 1. Get Gameweek Dates
    const { data: gameweek, error: gwError } = await supabaseAdmin
      .from("gameweeks")
      .select("start_date, end_date")
      .eq("id", gameweekId)
      .single<{ start_date: string; end_date: string }>();

    if (gwError || !gameweek) throw new Error("Gameweek not found");

    // 2. Get Matches in Gameweek
    const { data: matches, error: matchError } = await supabaseAdmin
      .from("matches")
      .select("id")
      .or(`gameweek_id.eq.${gameweekId},and(match_date.gte.${gameweek.start_date},match_date.lte.${gameweek.end_date})`)
      .returns<{ id: string }[]>();

    if (matchError) throw matchError;
    const matchIds = matches.map((m) => m.id);

    if (matchIds.length === 0) {
      console.log("No matches found for gameweek", gameweekId);
      return;
    }

    // 3. Get Player Performances
    const { data: performances, error: perfError } = await supabaseAdmin
      .from("player_performances")
      .select("player_id, fantasy_points")
      .in("match_id", matchIds)
      .returns<{ player_id: string | null; fantasy_points: number | null }[]>();

    if (perfError) throw perfError;
    
    const playerPointsMap = new Map<string, number>();
    performances?.forEach((p) => {
      if (!p.player_id) return;
      const current = playerPointsMap.get(p.player_id) || 0;
      playerPointsMap.set(p.player_id, current + (p.fantasy_points || 0));
    });

    // 4. Get Active User Rosters (STARTERS ONLY)
    const { data: rosters, error: rosterError } = await supabaseAdmin
      .from("user_rosters")
      .select("league_id, profile_id, player_id, pro_players!inner(is_legend, role)")
      .eq("slot_type", "starter")
      .returns<{ league_id: string | null; profile_id: string | null; player_id: string | null; pro_players: { is_legend: boolean; role: string } }[]>();

    if (rosterError) throw rosterError;

    // 5. Get Active Powerups (Captain)
    const { data: activePowerUps } = await (supabaseAdmin
      .from("active_powerups")
      .select("profile_id, target_player_id, powerup_types!inner(code)")
      .eq("gameweek_id", gameweekId)
      .eq("powerup_types.code", "CAPTAIN") as any);

    const captainMap = new Map<string, string>();
    activePowerUps?.forEach((ap: any) => {
      if (ap.profile_id && ap.target_player_id) {
        captainMap.set(ap.profile_id, ap.target_player_id);
      }
    });

    // 6. Get Active Casters for this Gameweek
    const { data: activeCasters } = await supabaseAdmin
      .from("active_casters")
      .select("profile_id, casters(buff_code)")
      .eq("gameweek_id", gameweekId);
    
    const casterMap = new Map<string, string[]>();
    activeCasters?.forEach((ac: any) => {
      if (ac.profile_id && ac.casters?.buff_code) {
        const existing = casterMap.get(ac.profile_id) || [];
        casterMap.set(ac.profile_id, [...existing, ac.casters.buff_code]);
      }
    });

    // 7. Aggregate Score per Participant
    const participantScores = new Map<string, { leagueId: string; profileId: string; points: number }>();

    // Performance map for specific event buffs (like Ulises Clutches)
    const playerPerfData = new Map<string, { clutches: number }>();
    performances?.forEach((p: any) => {
        if (!p.player_id) return;
        const current = playerPerfData.get(p.player_id) || { clutches: 0 };
        playerPerfData.set(p.player_id, {
            clutches: current.clutches + (p.clutches || 0)
        });
    });

    for (const r of rosters || []) {
      if (!r.league_id || !r.profile_id) continue;
      const key = `${r.league_id}-${r.profile_id}`;
      let points = 0;

      // Base Points (Normal or Legend)
      if (r.pro_players.is_legend) {
        let totalLegendPoints = 0;
        for (const mId of matchIds) {
            const { data: legendPoints } = await supabaseAdmin.rpc('calculate_legend_points', { 
                match_id: mId, 
                legend_id: r.player_id 
            });
            totalLegendPoints += Number(legendPoints || 0);
        }
        points = totalLegendPoints;
      } else {
        points = playerPointsMap.get(r.player_id!) || 0;
      }
      
      const captainPlayerId = captainMap.get(r.profile_id);
      if (captainPlayerId === r.player_id) points *= 2;

      // --- APPLY CASTER BUFFS (MAY BE MULTIPLE) ---
      const buffCodes = casterMap.get(r.profile_id);
      if (buffCodes && buffCodes.length > 0) {
        const playerRole = (r.pro_players as any).role?.trim().toUpperCase();
        
        buffCodes.forEach(buffCode => {
          switch (buffCode) {
            case 'ULISES_HYPE':
              const perf = playerPerfData.get(r.player_id!);
              if (perf && perf.clutches > 0) {
                points += (perf.clutches * 10);
              }
              break;
            case 'KAQUKA_TACTICS':
              if (playerRole === 'INICIADOR') points *= 1.2;
              break;
            case 'URI_CONTROL':
              if (playerRole === 'CENTINELA') points *= 1.2;
              break;
            case 'IKER_HEROIC':
              if (playerRole === 'DUELISTA') points *= 1.2;
              break;
            case 'LUIGI_STATS':
              if (playerRole === 'CONTROLADOR') points *= 1.2;
              break;
          }
        });
      }

      if (!participantScores.has(key)) {
        participantScores.set(key, { leagueId: r.league_id!, profileId: r.profile_id!, points: 0 });
      }
      participantScores.get(key)!.points += points;
    }

    // 7. Upsert Scores
    const upserts: ParticipantScoreInsert[] = Array.from(participantScores.values()).map((p) => ({
      league_id: p.leagueId,
      profile_id: p.profileId,
      gameweek_id: gameweekId,
      points_earned: p.points,
    }));

    if (upserts.length > 0) {
      await supabaseAdmin
        .from("participant_scores_history")
        .upsert(upserts as any, { onConflict: "league_id,profile_id,gameweek_id" });

      // 8. Update totals and optionally reward
      for (const p of upserts) {
        if (!p.league_id || !p.profile_id) continue;
        
        const { data: allScores } = await supabaseAdmin
          .from("participant_scores_history")
          .select("points_earned")
          .eq("league_id", p.league_id)
          .eq("profile_id", p.profile_id);

        const totalEarned = allScores?.reduce((sum: number, s: any) => sum + (s.points_earned || 0), 0) || 0;
        
        // --- NEW: Subtract spent points from shop ---
        const { data: transactions } = await supabaseAdmin
          .from("market_transactions")
          .select("price")
          .eq("league_id", p.league_id)
          .eq("profile_id", p.profile_id)
          .eq("type", "buy_item");
          
        const totalSpent = transactions?.reduce((sum, t) => sum + Number(t.price || 0), 0) || 0;
        const total = Math.max(0, totalEarned - totalSpent);
        
        await supabaseAdmin
          .from("league_participants")
          .update({ total_points: total } as any)
          .eq("league_id", p.league_id)
          .eq("profile_id", p.profile_id);

        const { data: allLeagues } = await supabaseAdmin
          .from("league_participants")
          .select("total_points")
          .eq("profile_id", p.profile_id);
        
        const globalTotal = allLeagues?.reduce((sum, l) => sum + (l.total_points || 0), 0) || 0;
        
        await supabaseAdmin
          .from("profiles")
          .update({ global_points: globalTotal } as any)
          .eq("id", p.profile_id);

        // --- FIXED: ONLY REWARD IF FINALIZED ---
        if (finalize) {
          const reward = Math.floor(p.points_earned! * 50000);
          const { data: currentP } = await supabaseAdmin.from('league_participants').select('current_budget').eq('league_id', p.league_id).eq('profile_id', p.profile_id).single();
          if (currentP) {
              await supabaseAdmin.from('league_participants')
                  .update({ current_budget: Number(currentP.current_budget) + reward } as any)
                  .eq('league_id', p.league_id)
                  .eq('profile_id', p.profile_id);
          }
        }
      }
    }
    
    // 9. Update Ranks (Bonuses also moved to finalize inside updateGameweekRanks)
    await updateGameweekRanks(gameweekId, finalize);

    return { success: true, processed: upserts.length };
  } catch (error) {
    console.error("Error calculating gameweek scores:", error);
    return { success: false, error };
  }
}

async function updateGameweekRanks(gameweekId: number, finalize: boolean = false) {
    // Fetch all scores for the gameweek
    const { data: scores } = await supabaseAdmin
        .from('participant_scores_history')
        .select('league_id, profile_id, points_earned')
        .eq('gameweek_id', gameweekId)
        .returns<{ league_id: string; profile_id: string; points_earned: number | null }[]>();
    
    if (!scores) return;

    // Group by league
    const byLeague = new Map<string, typeof scores>();
    scores.forEach(s => {
        if (!byLeague.has(s.league_id)) byLeague.set(s.league_id, []);
        byLeague.get(s.league_id)!.push(s);
    });

    const updates: ParticipantScoreInsert[] = [];

    // Calculate rank per league
    byLeague.forEach((participants, leagueId) => {
        participants.sort((a, b) => (b.points_earned || 0) - (a.points_earned || 0));
        participants.forEach((p, index) => {
            updates.push({
                league_id: p.league_id,
                profile_id: p.profile_id,
                gameweek_id: gameweekId,
                rank_in_league: index + 1
            });
        });
    });

    if (updates.length > 0) {
        await supabaseAdmin.from('participant_scores_history').upsert(updates as any, { onConflict: 'league_id,profile_id,gameweek_id'});
        
        // --- ADD RANK BONUSES ONLY IF FINALIZED ---
        if (finalize) {
          for (const up of updates) {
              let bonus = 0;
              if (up.rank_in_league === 1) bonus = 3000000;
              else if (up.rank_in_league === 2) bonus = 1500000;
              else if (up.rank_in_league === 3) bonus = 750000;

              if (bonus > 0) {
                  const { data: current } = await supabaseAdmin.from('league_participants').select('current_budget').eq('league_id', up.league_id!).eq('profile_id', up.profile_id!).single();
                  if (current) {
                      await supabaseAdmin.from('league_participants')
                          .update({ current_budget: Number(current.current_budget) + bonus } as any)
                          .eq('league_id', up.league_id!)
                          .eq('profile_id', up.profile_id!);
                  }
              }
          }
        }
    }
}
