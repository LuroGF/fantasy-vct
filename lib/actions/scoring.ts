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

    // 4. Get the frozen starters for this gameweek. Reading the current roster
    // here would allow later transfers or substitutions to rewrite past scores.
    const { data: rosters, error: rosterError } = await supabaseAdmin
      .from("gameweek_lineups")
      .select("league_id, profile_id, player_id")
      .eq("gameweek_id", gameweekId)
      .returns<{ league_id: string | null; profile_id: string | null; player_id: string | null }[]>();

    if (rosterError) throw rosterError;

    // 5. Aggregate score per participant. V1 only counts starter performance;
    // legends, casters, inventory and powerups remain paused and cannot alter it.
    const participantScores = new Map<string, { leagueId: string; profileId: string; points: number }>();

    for (const r of rosters || []) {
      if (!r.league_id || !r.profile_id || !r.player_id) continue;
      const key = `${r.league_id}-${r.profile_id}`;
      const points = playerPointsMap.get(r.player_id) || 0;

      if (!participantScores.has(key)) {
        participantScores.set(key, { leagueId: r.league_id!, profileId: r.profile_id!, points: 0 });
      }
      participantScores.get(key)!.points += points;
    }

    // 6. Upsert scores
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

      // 7. Update totals and optionally reward
      for (const p of upserts) {
        if (!p.league_id || !p.profile_id) continue;
        
        const { data: allScores } = await supabaseAdmin
          .from("participant_scores_history")
          .select("points_earned")
          .eq("league_id", p.league_id)
          .eq("profile_id", p.profile_id);

        const totalEarned = allScores?.reduce((sum: number, s: any) => sum + (s.points_earned || 0), 0) || 0;
        
        await supabaseAdmin
          .from("league_participants")
          .update({ total_points: totalEarned } as any)
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

      }
    }
    
    // 8. Update ranks. Money is settled atomically by the database ledger.
    await updateGameweekRanks(gameweekId);

    if (finalize) {
      const { error: rewardError } = await (supabaseAdmin as any).rpc(
        "settle_gameweek_rewards",
        { p_gameweek_id: gameweekId },
      );
      if (rewardError) throw rewardError;
    }

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
        let previousPoints: number | null = null;
        let previousRank = 0;
        participants.forEach((p, index) => {
            const points = p.points_earned || 0;
            const rank = previousPoints === points ? previousRank : index + 1;
            updates.push({
                league_id: p.league_id,
                profile_id: p.profile_id,
                gameweek_id: gameweekId,
                rank_in_league: rank
            });
            previousPoints = points;
            previousRank = rank;
        });
    });

    if (updates.length > 0) {
        await supabaseAdmin.from('participant_scores_history').upsert(updates as any, { onConflict: 'league_id,profile_id,gameweek_id'});
        
    }
}
