"use server";

import { supabaseAdmin } from "@/utils/supabase/admin";
import { Database } from "@/types/supabase";

type ParticipantScoreInsert = Database["public"]["Tables"]["participant_scores_history"]["Insert"];

/**
 * Calculates scores for all participants in a given gameweek.
 * Aggregates points from user rosters based on player performances in matches within the gameweek.
 */
export async function calculateGameweekScores(gameweekId: number) {
  try {
    // 1. Get Gameweek Dates
    const { data: gameweek, error: gwError } = await supabaseAdmin
      .from("gameweeks")
      .select("start_date, end_date")
      .eq("id", gameweekId)
      .single<{ start_date: string; end_date: string }>();

    if (gwError || !gameweek) throw new Error("Gameweek not found");

    // 2. Get Matches in Gameweek
    // First, try matches explicitly assigned to this gameweek_id
    // Fallback to date range if needed
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

    // 3. Get Player Performances for these matches
    const { data: performances, error: perfError } = await supabaseAdmin
      .from("player_performances")
      .select("player_id, fantasy_points")
      .in("match_id", matchIds)
      .returns<{ player_id: string | null; fantasy_points: number | null }[]>();

    if (perfError) throw perfError;
    if (!performances) {
        console.warn("No performances returned for matches", matchIds);
        return;
    }

    // Map: PlayerID -> Total Points in Gameweek
    const playerPointsMap = new Map<string, number>();
    performances.forEach((p) => {
      if (!p.player_id) return;
      const current = playerPointsMap.get(p.player_id) || 0;
      playerPointsMap.set(p.player_id, current + (p.fantasy_points || 0));
    });

    // 4. Get Active User Rosters (STARTERS ONLY)
    // In a real scenario, we need to know the roster state AT THE TIME of the match.
    // For now, simpler logic: Current active roster.
    const { data: rosters, error: rosterError } = await supabaseAdmin
      .from("user_rosters")
      .select("league_id, profile_id, player_id")
      .eq("is_active", true)
      .eq("is_starter", true) // SOLO TITULARES PUNTÚAN
      .returns<{ league_id: string | null; profile_id: string | null; player_id: string | null }[]>();

    if (rosterError) throw rosterError;
    if (!rosters) {
        console.log("No active rosters found");
        return;
    }

    // 5. Get Active Powerups for this gameweek (Captain multiplier)
    const { data: activePowerUps } = await (supabaseAdmin
      .from("active_powerups")
      .select("profile_id, target_player_id, powerup_types!inner(code)")
      .eq("gameweek_id", gameweekId)
      .eq("powerup_types.code", "CAPTAIN") as any);

    const captainMap = new Map<string, string>(); // profile_id -> player_id
    activePowerUps?.forEach((ap: any) => {
      if (ap.profile_id && ap.target_player_id) {
        captainMap.set(ap.profile_id, ap.target_player_id);
      }
    });

    // 6. Aggregate Score per Participant
    const participantScores = new Map<string, { leagueId: string; profileId: string; points: number }>();

    rosters.forEach((r) => {
      if (!r.league_id || !r.profile_id) return;
      const key = `${r.league_id}-${r.profile_id}`;
      
      let points = playerPointsMap.get(r.player_id!) || 0;
      
      // Apply Captain Multiplier (x2)
      const captainPlayerId = captainMap.get(r.profile_id);
      if (captainPlayerId === r.player_id) {
        points = points * 2;
      }

      if (!participantScores.has(key)) {
        participantScores.set(key, { leagueId: r.league_id!, profileId: r.profile_id!, points: 0 });
      }
      const entry = participantScores.get(key)!;
      entry.points += points;
    });

    // 6. Upsert Scores
    const upserts: ParticipantScoreInsert[] = Array.from(participantScores.values()).map((p) => ({
      league_id: p.leagueId,
      profile_id: p.profileId,
      gameweek_id: gameweekId,
      points_earned: p.points,
    }));

    if (upserts.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from("participant_scores_history")
        .upsert(upserts as any, { onConflict: "league_id,profile_id,gameweek_id" });

      if (upsertError) throw upsertError;

      // 6.5. Update cumulative total_points in league_participants
      // We do this by summing all points in history for each affected (league, profile)
      for (const p of upserts) {
        if (!p.league_id || !p.profile_id) continue;
        
        const { data: allScores } = await supabaseAdmin
          .from("participant_scores_history")
          .select("points_earned")
          .eq("league_id", p.league_id)
          .eq("profile_id", p.profile_id);
        
        const total = allScores?.reduce((sum, s) => sum + (s.points_earned || 0), 0) || 0;
        
        await supabaseAdmin
          .from("league_participants")
          .update({ total_points: total } as any)
          .eq("league_id", p.league_id)
          .eq("profile_id", p.profile_id);

        // 6.6 Update Global points in profiles
        const { data: allLeagues } = await supabaseAdmin
          .from("league_participants")
          .select("total_points")
          .eq("profile_id", p.profile_id);
        
        const globalTotal = allLeagues?.reduce((sum, l) => sum + (l.total_points || 0), 0) || 0;
        
        await supabaseAdmin
          .from("profiles")
          .update({ global_points: globalTotal } as any)
          .eq("id", p.profile_id);
      }
    }
    
    // 7. Update Ranks (Optional simplified ranking)
    // We can do this in a separate pass or optimized query
    await updateGameweekRanks(gameweekId);

    return { success: true, processed: upserts.length };

  } catch (error) {
    console.error("Error calculating gameweek scores:", error);
    return { success: false, error };
  }
}

async function updateGameweekRanks(gameweekId: number) {
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
    }
}
